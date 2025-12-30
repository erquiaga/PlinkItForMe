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

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const BASE_CONFIG = {
  canvasWidth: 800,
  canvasHeight: 500,
  gravity: isMobile ? 0.8 : 1.2,
  pegRows: isMobile ? 6 : 9,
  pegSpacing: 80,
  pegRadius: 4,
  ballRadius: 15,
  ballRestitution: isMobile ? 0.3 : 0.5,
  ballFriction: 0.01,
  ballAirResistance: isMobile ? 0.015 : 0.008,
  ballDensity: 0.0008,
};

function getResponsiveConfig() {
  const windowWidth = window.innerWidth;
  const scale = windowWidth < 600 ? windowWidth / 800 : 1;

  return {
    canvasWidth: BASE_CONFIG.canvasWidth * scale,
    canvasHeight: BASE_CONFIG.canvasHeight * scale,
    gravity: BASE_CONFIG.gravity,
    pegRows: BASE_CONFIG.pegRows,
    pegSpacing: BASE_CONFIG.pegSpacing * scale,
    pegRadius: BASE_CONFIG.pegRadius * scale,
    ballRadius: BASE_CONFIG.ballRadius * scale,
    ballRestitution: BASE_CONFIG.ballRestitution,
    ballFriction: BASE_CONFIG.ballFriction,
    ballAirResistance: BASE_CONFIG.ballAirResistance,
    ballDensity: BASE_CONFIG.ballDensity,
    scale,
  };
}

function createPegs(
  rows: number,
  spacing: number,
  config: ReturnType<typeof getResponsiveConfig>
): Matter.Body[] {
  const pegs: Matter.Body[] = [];

  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (spacing / 2);
    const numPegs = 9;

    for (let col = 0; col < numPegs; col++) {
      const peg = Matter.Bodies.circle(
        70 * config.scale + offset + col * spacing,
        100 * config.scale + row * 40 * config.scale,
        config.pegRadius,
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

function createSlots(
  movieCount: number,
  canvasWidth: number,
  canvasHeight: number,
  scale: number
) {
  const slotWidth = canvasWidth / movieCount;
  const slots: Matter.Body[] = [];

  const slotY = canvasHeight - 40 * scale;
  const slotHeight = 80 * scale;

  for (let i = 0; i <= movieCount; i++) {
    const divider = Matter.Bodies.rectangle(
      i * slotWidth,
      slotY,
      3 * scale,
      slotHeight,
      {
        isStatic: true,
        render: { fillStyle: COLORS.blue },
        friction: 0.1,
        restitution: 0.3,
      }
    );
    slots.push(divider);
  }

  return slots;
}

function createStaticBodies(canvasWidth: number, canvasHeight: number) {
  return {
    ground: Matter.Bodies.rectangle(
      canvasWidth / 2,
      canvasHeight + 10,
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

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function Plinko({ movies }: PlinkoProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const popSoundRef = useRef<HTMLAudioElement | null>(null);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const lastSoundTime = useRef(0);
  const [shuffledMovies, setShuffledMovies] = useState<Movie[]>(movies);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [config, setConfig] = useState(getResponsiveConfig());

  useEffect(() => {
    setShuffledMovies(movies);
  }, [movies]);

  useEffect(() => {
    const handleResize = () => {
      setConfig(getResponsiveConfig());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    popSoundRef.current = new Audio('/sounds/pop.mp3');
    popSoundRef.current.volume = 0.3;

    coinSoundRef.current = new Audio('/sounds/sf2_coin.mp3');
    coinSoundRef.current.volume = 0.5;

    const engine = Matter.Engine.create();
    engineRef.current = engine;
    engine.world.gravity.y = config.gravity;

    if (isMobile) {
      engine.positionIterations = 3;
      engine.velocityIterations = 3;
    }

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: config.canvasWidth,
        height: config.canvasHeight,
        wireframes: false,
        background: COLORS.background,
        pixelRatio: isMobile ? 1 : window.devicePixelRatio,
      },
    });

    const { ground, leftWall, rightWall } = createStaticBodies(
      config.canvasWidth,
      config.canvasHeight
    );
    const pegs = createPegs(config.pegRows, config.pegSpacing, config);
    const slots = createSlots(
      shuffledMovies.length,
      config.canvasWidth,
      config.canvasHeight,
      config.scale
    );

    Matter.World.add(engine.world, [
      ground,
      leftWall,
      rightWall,
      ...pegs,
      ...slots,
    ]);

    Matter.Events.on(engine, 'collisionStart', (event) => {
      if (isMobile) return;

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

    const slotWidth = config.canvasWidth / shuffledMovies.length;

    Matter.Events.on(engine, 'afterUpdate', () => {
      const balls = engine.world.bodies.filter((body) => body.label === 'ball');

      balls.forEach((ball) => {
        const settlementY = config.canvasHeight - 100 * config.scale;

        const isSettled =
          ball.position.y > settlementY &&
          Math.abs(ball.velocity.x) < 0.5 &&
          Math.abs(ball.velocity.y) < 0.5;

        if (isSettled) {
          const slotIndex = Math.floor(ball.position.x / slotWidth);

          if (slotIndex >= 0 && slotIndex < shuffledMovies.length) {
            setSelectedMovie(shuffledMovies[slotIndex]);
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
          ball.position.y > config.canvasHeight + 50 ||
          ball.position.y < 0 ||
          ball.position.x < 0 ||
          ball.position.x > config.canvasWidth;

        if (isOutOfBounds) {
          Matter.World.remove(engine.world, ball);
          setIsDropping(false);
        }
      });
    });

    const runner = Matter.Runner.create({
      delta: isMobile ? 1000 / 24 : 1000 / 60,
    });

    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
    };
  }, [shuffledMovies, config]);

  useEffect(() => {
    if (selectedMovie) {
      setPosterLoaded(false);
    }
  }, [selectedMovie]);

  const dropBall = () => {
    if (!engineRef.current || isDropping) return;

    setIsDropping(true);
    setSelectedMovie(null);

    const world = engineRef.current.world;

    const oldBalls = world.bodies.filter((body) => body.label === 'ball');
    Matter.World.remove(world, oldBalls);

    engineRef.current.timing.timeScale = 1;

    const ball = Matter.Bodies.circle(
      200 * config.scale + Math.random() * 400 * config.scale,
      50 * config.scale,
      config.ballRadius,
      {
        isStatic: false,
        restitution: config.ballRestitution,
        friction: config.ballFriction,
        frictionAir: config.ballAirResistance,
        density: config.ballDensity,
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

  const handleShuffle = () => {
    if (isDropping) return;
    setShuffledMovies(shuffleArray(shuffledMovies));
    setSelectedMovie(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className='plinko-container'>
      <div className='button-container'>
        <button
          onClick={dropBall}
          disabled={isDropping}
          className='drop-button'
        >
          {isDropping ? 'Dropping...' : 'Drop Ball!'}
        </button>
        <button
          onClick={handleShuffle}
          disabled={isDropping}
          className='shuffle-button'
        >
          🔀 Shuffle
        </button>
      </div>

      <div ref={sceneRef} className='canvas-container' />

      <div className='movie-labels'>
        {shuffledMovies.map((movie, index) => (
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
        destroyOnHidden={true}
        maskClosable={true}
        transitionName=''
      >
        {selectedMovie && (
          <div className='modal-content'>
            {selectedMovie.poster ? (
              <div className='poster-container'>
                {!posterLoaded && <div className='poster-skeleton'></div>}

                <img
                  src={selectedMovie.poster}
                  alt={selectedMovie.title}
                  className={`modal-poster ${posterLoaded ? 'loaded' : ''}`}
                  onLoad={() => setPosterLoaded(true)}
                  onError={() => setPosterLoaded(true)}
                />
              </div>
            ) : (
              <div className='modal-poster-placeholder'>
                <div className='placeholder-icon'>🎬</div>
                <p className='placeholder-text'>No poster available</p>
              </div>
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
