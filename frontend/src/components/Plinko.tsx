import { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Modal } from 'antd';
import type { Movie } from '../api/Api';
import './Plinko.css';

interface PlinkoProps {
  movies: Movie[];
}

const COLORS = {
  orange: '#ff8000',
  green: '#00e054',
  blue: '#40bcf4',
  background: '#14181c',
};

const PHYSICS_CONFIG = {
  canvasWidth: 800,
  canvasHeight: 600,
  gravity: 1.2,
  pegRows: 9,
  pegSpacing: 80,
  pegRadius: 4,
  ballRadius: 15,
  ballRestitution: 0.5,
  ballFriction: 0.01,
  ballAirResistance: 0.008,
  ballDensity: 0.0008,
};

function createPegs(rows: number, spacing: number): Matter.Body[] {
  const pegs: Matter.Body[] = [];

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (spacing / 2);
    const numPegs = 9;

    for (let col = 0; col < numPegs; col++) {
      const peg = Matter.Bodies.circle(
        70 + offset + col * spacing,
        120 + row * 40,
        PHYSICS_CONFIG.pegRadius,
        {
          isStatic: true,
          restitution: 0.6,
          friction: 0.05,
          render: { fillStyle: COLORS.orange },
        }
      );
      pegs.push(peg);
    }
  }

  return pegs;
}

function createSlots(movieCount: number, canvasWidth: number): Matter.Body[] {
  const slotWidth = canvasWidth / movieCount;
  const slots: Matter.Body[] = [];

  for (let i = 0; i <= movieCount; i++) {
    const divider = Matter.Bodies.rectangle(i * slotWidth, 530, 3, 140, {
      isStatic: true,
      render: { fillStyle: COLORS.blue },
      friction: 0.1,
      restitution: 0.3,
    });
    slots.push(divider);
  }

  return slots;
}

function createStaticBodies(canvasWidth: number, canvasHeight: number) {
  return {
    ground: Matter.Bodies.rectangle(
      canvasWidth / 2,
      canvasHeight - 5,
      canvasWidth + 20,
      30,
      {
        isStatic: true,
        render: { fillStyle: COLORS.background },
      }
    ),
    leftWall: Matter.Bodies.rectangle(0, canvasHeight / 2, 10, canvasHeight, {
      isStatic: true,
      render: { fillStyle: COLORS.background },
    }),
    rightWall: Matter.Bodies.rectangle(
      canvasWidth,
      canvasHeight / 2,
      10,
      canvasHeight,
      {
        isStatic: true,
        render: { fillStyle: COLORS.background },
      }
    ),
  };
}

export default function Plinko({ movies }: PlinkoProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const popSoundRef = useRef<HTMLAudioElement | null>(null);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const lastSoundTime = useRef(0);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!sceneRef.current) return;

    popSoundRef.current = new Audio('/sounds/pop.mp3');
    popSoundRef.current.volume = 0.3;

    coinSoundRef.current = new Audio('/sounds/sf2_coin.mp3');
    coinSoundRef.current.volume = 0.5;

    const engine = Matter.Engine.create();
    engineRef.current = engine;
    engine.world.gravity.y = PHYSICS_CONFIG.gravity;

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: PHYSICS_CONFIG.canvasWidth,
        height: PHYSICS_CONFIG.canvasHeight,
        wireframes: false,
        background: COLORS.background,
      },
    });

    const { ground, leftWall, rightWall } = createStaticBodies(
      PHYSICS_CONFIG.canvasWidth,
      PHYSICS_CONFIG.canvasHeight
    );
    const pegs = createPegs(PHYSICS_CONFIG.pegRows, PHYSICS_CONFIG.pegSpacing);
    const slots = createSlots(movies.length, PHYSICS_CONFIG.canvasWidth);

    Matter.World.add(engine.world, [
      ground,
      leftWall,
      rightWall,
      ...pegs,
      ...slots,
    ]);

    Matter.Events.on(engine, 'collisionStart', (event) => {
      const now = Date.now();

      if (now - lastSoundTime.current < 50) return;

      event.pairs.forEach((pair) => {
        const isBallCollision =
          pair.bodyA.label === 'ball' || pair.bodyB.label === 'ball';

        if (isBallCollision && popSoundRef.current) {
          const sound = popSoundRef.current.cloneNode() as HTMLAudioElement;
          sound.volume = 0.2;
          sound.play().catch(() => {});
          lastSoundTime.current = now;
        }
      });
    });

    const slotWidth = PHYSICS_CONFIG.canvasWidth / movies.length;

    Matter.Events.on(engine, 'afterUpdate', () => {
      const balls = engine.world.bodies.filter((body) => body.label === 'ball');

      balls.forEach((ball) => {
        const isSettled =
          ball.position.y > 520 &&
          Math.abs(ball.velocity.x) < 0.5 &&
          Math.abs(ball.velocity.y) < 0.5;

        if (isSettled) {
          const slotIndex = Math.floor(ball.position.x / slotWidth);

          if (slotIndex >= 0 && slotIndex < movies.length) {
            setSelectedMovie(movies[slotIndex]);
            setIsModalOpen(true);

            if (coinSoundRef.current) {
              coinSoundRef.current.currentTime = 0;
              coinSoundRef.current.play().catch(() => {});
            }

            setIsDropping(false);
            Matter.World.remove(engine.world, ball);
          }
        }

        const isOutOfBounds =
          ball.position.y > 650 ||
          ball.position.y < 0 ||
          ball.position.x < 0 ||
          ball.position.x > PHYSICS_CONFIG.canvasWidth;

        if (isOutOfBounds) {
          Matter.World.remove(engine.world, ball);
          setIsDropping(false);
        }
      });
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
    };
  }, [movies]);

  const dropBall = () => {
    if (!engineRef.current || isDropping) return;

    setIsDropping(true);
    setSelectedMovie(null);

    const world = engineRef.current.world;

    const oldBalls = world.bodies.filter((body) => body.label === 'ball');
    Matter.World.remove(world, oldBalls);

    engineRef.current.timing.timeScale = 1;

    const ball = Matter.Bodies.circle(
      200 + Math.random() * 400,
      50,
      PHYSICS_CONFIG.ballRadius,
      {
        isStatic: false,
        restitution: PHYSICS_CONFIG.ballRestitution,
        friction: PHYSICS_CONFIG.ballFriction,
        frictionAir: PHYSICS_CONFIG.ballAirResistance,
        density: PHYSICS_CONFIG.ballDensity,
        render: { fillStyle: COLORS.green },
        label: 'ball',
      }
    );

    Matter.Body.setVelocity(ball, {
      x: (Math.random() - 0.5) * 12,
      y: 2,
    });
    Matter.Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.4);

    Matter.World.add(world, ball);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className='plinko-container'>
      <button onClick={dropBall} disabled={isDropping} className='drop-button'>
        {isDropping ? 'Dropping...' : 'Drop Ball!'}
      </button>

      <div ref={sceneRef} className='canvas-container' />

      <div className='movie-labels'>
        {movies.map((movie, index) => (
          <div key={index} className='movie-label' title={movie.title}>
            {movie.title}
          </div>
        ))}
      </div>

      <Modal
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        centered
        width={400}
        className='movie-modal'
        destroyOnClose={true}
        maskClosable={true}
        transitionName=''
      >
        {selectedMovie && (
          <div className='modal-content'>
            {selectedMovie.poster && (
              <img
                src={selectedMovie.poster}
                alt={selectedMovie.title}
                className='modal-poster'
              />
            )}
            <h3 className='modal-label'>You should watch</h3>
            <h2 className='modal-title'>{selectedMovie.title}</h2>
            <p className='modal-year'>({selectedMovie.year})</p>

            {selectedMovie.url && (
              <a
                href={selectedMovie.url}
                target='_blank'
                rel='noopener noreferrer'
                className='modal-link'
              >
                View on Letterboxd
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
