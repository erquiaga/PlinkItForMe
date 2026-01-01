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

// Detect if user is on mobile device
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/**
 * Gets responsive configuration based on current viewport size
 * Adapts to portrait/landscape and different screen sizes dynamically
 */
function getResponsiveConfig() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Use mobile layout for screens narrower than 768px
  const useMobileLayout = viewportWidth < 768;

  if (useMobileLayout) {
    // Detect landscape vs portrait
    const isLandscape = viewportWidth > viewportHeight;

    if (isLandscape) {
      // Landscape mobile: Use more width, compact height
      const canvasWidth = Math.min(viewportWidth - 40, 650);
      const canvasHeight = 280;

      return {
        canvasWidth,
        canvasHeight,
        gravity: 1.0,
        pegRows: 4,
        pegSpacing: canvasWidth / 11,
        pegRadius: 3,
        ballRadius: 10,
        ballRestitution: 0.5,
        ballFriction: 0,
        ballDensity: 1.0,
        pegStartY: 40,
        pegEndY: 160,
      };
    } else {
      const canvasWidth = Math.min(viewportWidth - 40, 500);
      const canvasHeight = Math.min(viewportHeight * 0.6, 600);

      return {
        canvasWidth,
        canvasHeight,
        gravity: 1.0,
        pegRows: 7,
        pegSpacing: canvasWidth / 10,
        pegRadius: 4,
        ballRadius: 12,
        ballRestitution: 0.5,
        ballFriction: 0,
        ballDensity: 1.0,
        pegStartY: canvasHeight * 0.2,
        pegEndY: canvasHeight * 0.65,
      };
    }
  } else {
    return {
      canvasWidth: 800,
      canvasHeight: 500,
      gravity: 1.0,
      pegRows: 9,
      pegSpacing: 80,
      pegRadius: 5,
      ballRadius: 12,
      ballRestitution: 0.5,
      ballFriction: 0,
      ballDensity: 1.0,
      pegStartY: 100,
      pegEndY: 400,
    };
  }
}

/**
 * Creates the grid of pegs that the ball bounces off
 * @param config - The device-specific configuration (mobile or desktop)
 * @returns Array of Matter.js peg bodies
 */
function createPegs(
  config: ReturnType<typeof getResponsiveConfig>
): Matter.Body[] {
  const pegs: Matter.Body[] = [];
  const numPegs = 9; // Number of pegs per row

  // Calculate the total width needed for all pegs
  const totalPegWidth = (numPegs - 1) * config.pegSpacing;

  // Account for alternating row offset when centering
  const maxOffset = config.pegSpacing / 2;
  const startX = (config.canvasWidth - totalPegWidth - maxOffset) / 2;

  // Calculate vertical spacing to fit pegRows between pegStartY and pegEndY
  const verticalSpace = config.pegEndY - config.pegStartY;
  const verticalSpacing = verticalSpace / (config.pegRows - 1);

  for (let row = 0; row < config.pegRows; row++) {
    const offset = (row % 2) * (config.pegSpacing / 2);

    for (let col = 0; col < numPegs; col++) {
      const x = startX + offset + col * config.pegSpacing;
      const y = config.pegStartY + row * verticalSpacing;

      const peg = Matter.Bodies.circle(x, y, config.pegRadius, {
        isStatic: true,
        restitution: 0.5,
        friction: 0,
        render: { fillStyle: COLORS.orange },
      });
      pegs.push(peg);
    }
  }

  return pegs;
}

/**
 * Creates the vertical dividers at the bottom (the "bins" where balls land)
 * @param movieCount - Number of movies (determines number of slots)
 * @param canvasWidth - Width of canvas
 * @param canvasHeight - Height of canvas
 * @returns Array of Matter.js divider bodies
 */
function createSlots(
  movieCount: number,
  canvasWidth: number,
  canvasHeight: number
): Matter.Body[] {
  const slotWidth = canvasWidth / movieCount; // Each movie gets equal width
  const slots: Matter.Body[] = [];
  const slotY = canvasHeight - 50; // Position from bottom
  const slotHeight = 100; // Height of divider walls

  // Create dividers (need movieCount + 1 dividers to create movieCount slots)
  for (let i = 0; i <= movieCount; i++) {
    const divider = Matter.Bodies.rectangle(
      i * slotWidth,
      slotY,
      3, // Divider thickness
      slotHeight,
      {
        isStatic: true,
        render: { fillStyle: COLORS.blue },
        friction: 0,
        restitution: 0.5,
      }
    );
    slots.push(divider);
  }

  return slots;
}

/**
 * Creates the walls and floor that contain the physics simulation
 * @param canvasWidth - Width of canvas
 * @param canvasHeight - Height of canvas
 * @returns Object containing ground, leftWall, and rightWall bodies
 */
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

/**
 * Fisher-Yates shuffle algorithm to randomize movie order
 * @param array - Array to shuffle
 * @returns New shuffled array (doesn't mutate original)
 */
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

  // Handle window resize and orientation changes
  useEffect(() => {
    const handleResize = () => {
      setConfig(getResponsiveConfig());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Main physics engine setup - runs when movies or config changes
  useEffect(() => {
    if (!sceneRef.current) return;

    // Load sound effects
    coinSoundRef.current = new Audio('/sounds/sf2_coin.mp3');
    coinSoundRef.current.volume = 0.5;

    if (!isMobile) {
      popSoundRef.current = new Audio('/sounds/pop.mp3');
      popSoundRef.current.volume = 0.3;
    }

    // Create Matter.js physics engine
    const engine = Matter.Engine.create();
    engineRef.current = engine;
    engine.gravity.y = config.gravity;

    // Create visual renderer
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: config.canvasWidth,
        height: config.canvasHeight,
        wireframes: false,
        background: COLORS.background,
        pixelRatio: 1,
        showAngleIndicator: false,
        showVelocity: false,
        showCollisions: false,
      },
    });

    // Create all physics bodies
    const { ground, leftWall, rightWall } = createStaticBodies(
      config.canvasWidth,
      config.canvasHeight
    );
    const pegs = createPegs(config);
    const slots = createSlots(
      shuffledMovies.length,
      config.canvasWidth,
      config.canvasHeight
    );

    // Add all bodies to the physics world
    Matter.World.add(engine.world, [
      ground,
      leftWall,
      rightWall,
      ...pegs,
      ...slots,
    ]);

    // Collision sound handler (desktop only)
    Matter.Events.on(engine, 'collisionStart', (event) => {
      if (isMobile) return; // Skip on mobile for performance

      const now = Date.now();
      if (now - lastSoundTime.current < 50) return; // Throttle sounds

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

    // Check ball position each physics update
    Matter.Events.on(engine, 'afterUpdate', () => {
      const balls = engine.world.bodies.filter((body) => body.label === 'ball');

      balls.forEach((ball) => {
        const settlementY = config.canvasHeight - 100;

        // Check if ball has settled in a slot (low velocity near bottom)
        const isSettled =
          ball.position.y > settlementY &&
          Math.abs(ball.velocity.x) < 0.5 &&
          Math.abs(ball.velocity.y) < 0.5;

        if (isSettled) {
          // Determine which slot the ball landed in
          const slotIndex = Math.floor(ball.position.x / slotWidth);

          if (slotIndex >= 0 && slotIndex < shuffledMovies.length) {
            // Show the selected movie
            setSelectedMovie(shuffledMovies[slotIndex]);
            setIsModalOpen(true);

            // Play coin sound
            if (coinSoundRef.current) {
              coinSoundRef.current.currentTime = 0;
              coinSoundRef.current.play().catch(() => {});
            }

            // Clean up
            setIsDropping(false);
            Matter.World.remove(engine.world, ball);
          }
        }

        // Remove balls that fall out of bounds
        const isOutOfBounds =
          ball.position.y > config.canvasHeight + 100 ||
          ball.position.x < -50 ||
          ball.position.x > config.canvasWidth + 50;

        if (isOutOfBounds) {
          Matter.World.remove(engine.world, ball);
          setIsDropping(false);
        }
      });
    });

    // Create physics runner (60fps)
    const runner = Matter.Runner.create({
      delta: 1000 / 60, // 60 frames per second
    });

    // Start the simulation
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    // Cleanup when component unmounts or config changes
    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      if (render.canvas) render.canvas.remove();
    };
  }, [shuffledMovies, config]);

  // Reset poster loaded state when movie changes
  useEffect(() => {
    if (selectedMovie) {
      setPosterLoaded(false);
    }
  }, [selectedMovie]);

  /**
   * Drops a ball into the Plinko board
   * Creates randomized starting position and velocity for varied outcomes
   */
  const dropBall = () => {
    if (!engineRef.current || isDropping) return;

    setIsDropping(true);
    setSelectedMovie(null);

    const world = engineRef.current.world;

    // Remove any existing balls
    const oldBalls = world.bodies.filter((body) => body.label === 'ball');
    Matter.World.remove(world, oldBalls);

    // Random starting X position (within middle 60% of canvas)
    const randomX =
      config.canvasWidth * 0.2 + Math.random() * config.canvasWidth * 0.6;

    // Create the ball
    const ball = Matter.Bodies.circle(randomX, 30, config.ballRadius, {
      restitution: config.ballRestitution,
      friction: config.ballFriction,
      density: config.ballDensity,
      render: { fillStyle: COLORS.green },
      label: 'ball',
    });

    // Add random initial velocity for more varied outcomes
    Matter.Body.setVelocity(ball, {
      x: (Math.random() - 0.5) * 15, // Random horizontal velocity
      y: Math.random() * 3, // Random downward velocity
    });

    // Add random spin
    Matter.Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.5);

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
