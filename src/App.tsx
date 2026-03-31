/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw } from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const CELL_SIZE = 20; // px
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const GAME_SPEED = 120; // ms

const TRACKS = [
  {
    id: 1,
    title: "Neon Horizon (AI Generated)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: 2,
    title: "Cybernetic Pulse (AI Generated)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: 3,
    title: "Digital Dreams (AI Generated)",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  }
];

// --- Types ---
type Point = { x: number; y: number };

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 15, y: 5 });
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // Refs for game loop to avoid dependency issues in setInterval
  const snakeRef = useRef(snake);
  const directionRef = useRef(direction);
  const foodRef = useRef(food);
  const gameOverRef = useRef(gameOver);
  const isPausedRef = useRef(isPaused);
  const hasStartedRef = useRef(hasStarted);

  // --- Music State ---
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // --- Game Logic ---
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    let isOccupied = true;
    while (isOccupied) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      isOccupied = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood!;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setFood(generateFood(INITIAL_SNAKE));
    setHasStarted(true);
    setIsPaused(false);
  };

  useEffect(() => {
    snakeRef.current = snake;
    directionRef.current = direction;
    foodRef.current = food;
    gameOverRef.current = gameOver;
    isPausedRef.current = isPaused;
    hasStartedRef.current = hasStarted;
  }, [snake, direction, food, gameOver, isPaused, hasStarted]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' && hasStartedRef.current && !gameOverRef.current) {
        setIsPaused(p => !p);
        return;
      }

      if (!hasStartedRef.current || isPausedRef.current || gameOverRef.current) return;

      const currentDir = directionRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir.y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir.y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir.x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir.x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const moveSnake = () => {
      if (gameOverRef.current || isPausedRef.current || !hasStartedRef.current) return;

      const currentSnake = [...snakeRef.current];
      const head = { ...currentSnake[0] };
      const dir = directionRef.current;

      head.x += dir.x;
      head.y += dir.y;

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameOver(true);
        return;
      }

      // Check self collision
      if (currentSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setGameOver(true);
        return;
      }

      currentSnake.unshift(head);

      // Check food collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        setScore(s => s + 10);
        setFood(generateFood(currentSnake));
      } else {
        currentSnake.pop();
      }

      setSnake(currentSnake);
    };

    const gameLoop = setInterval(moveSnake, GAME_SPEED);
    return () => clearInterval(gameLoop);
  }, [generateFood]);

  // --- Music Logic ---
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      const val = (audio.currentTime / audio.duration) * 100;
      setProgress(isNaN(val) ? 0 : val);
    };

    const handleEnded = () => {
      nextTrack();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio play failed:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  
  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="min-h-screen bg-neutral-950 text-cyan-400 font-mono flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
      <audio 
        ref={audioRef} 
        src={TRACKS[currentTrackIndex].url} 
        preload="auto"
      />

      <h1 className="text-4xl md:text-5xl font-black mb-8 tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">
        Neon Snake
      </h1>
      
      <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start w-full max-w-5xl justify-center">
        
        {/* Game Board Container */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div 
            className="relative bg-black border border-cyan-500/50 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.15)]"
            style={{ 
              width: GRID_SIZE * CELL_SIZE, 
              height: GRID_SIZE * CELL_SIZE,
              backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)',
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`
            }}
          >
            {/* Snake */}
            {snake.map((segment, i) => (
              <div
                key={i}
                className={`absolute rounded-sm ${i === 0 ? 'bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)] z-10' : 'bg-cyan-500/80 shadow-[0_0_5px_rgba(6,182,212,0.5)]'}`}
                style={{
                  left: segment.x * CELL_SIZE,
                  top: segment.y * CELL_SIZE,
                  width: CELL_SIZE - 1,
                  height: CELL_SIZE - 1,
                }}
              />
            ))}

            {/* Food */}
            <div
              className="absolute bg-fuchsia-500 rounded-full shadow-[0_0_15px_rgba(217,70,239,0.9)] animate-pulse"
              style={{
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
                width: CELL_SIZE - 1,
                height: CELL_SIZE - 1,
              }}
            />

            {/* Overlays */}
            {!hasStarted && !gameOver && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <button 
                  onClick={resetGame}
                  className="px-6 py-3 border-2 border-cyan-400 text-cyan-400 font-bold uppercase tracking-widest hover:bg-cyan-400 hover:text-black transition-all shadow-[0_0_15px_rgba(34,211,238,0.5)] hover:shadow-[0_0_25px_rgba(34,211,238,0.8)]"
                >
                  Start Game
                </button>
                <p className="mt-4 text-cyan-500/70 text-sm">Use Arrow Keys or WASD</p>
              </div>
            )}

            {isPaused && hasStarted && !gameOver && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
                <p className="text-3xl font-bold text-cyan-400 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse">Paused</p>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center z-20 border-2 border-red-500">
                <div className="glitch-wrapper mb-2">
                  <p 
                    className="text-7xl md:text-8xl font-digital text-red-500 tracking-widest uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] glitch-text"
                    data-text="GAME OVER"
                  >
                    GAME OVER
                  </p>
                </div>
                <p className="text-4xl font-digital text-red-300 mb-8 tracking-widest">Final Score: {score}</p>
                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-6 py-3 bg-red-500/20 border-2 border-red-500 text-red-400 font-bold uppercase tracking-widest hover:bg-red-500 hover:text-black transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)]"
                >
                  <RefreshCw className="w-5 h-5" /> Play Again
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Side Panels */}
        <div className="flex flex-col gap-6 w-full max-w-xs">
          
          {/* Score Panel */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-fuchsia-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative border border-fuchsia-500/30 p-6 rounded-lg bg-neutral-900/80 backdrop-blur-xl flex flex-col items-center">
              <h2 className="text-fuchsia-400 text-sm font-bold mb-1 uppercase tracking-[0.2em]">Score</h2>
              <p className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tabular-nums">
                {score}
              </p>
            </div>
          </div>
          
          {/* Music Player Panel */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative border border-emerald-500/30 p-6 rounded-lg bg-neutral-900/80 backdrop-blur-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-emerald-400 text-sm font-bold uppercase tracking-[0.2em]">AI Radio</h2>
                <button onClick={toggleMute} className="text-emerald-500/70 hover:text-emerald-400 transition-colors">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-2 h-2 rounded-full bg-emerald-400 ${isPlaying ? 'animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'opacity-50'}`}></div>
                  <p className="text-xs text-emerald-100/90 truncate font-sans tracking-wide">
                    {TRACKS[currentTrackIndex].title}
                  </p>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden border border-emerald-900/30">
                   <div 
                     className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                     style={{ width: `${progress}%` }} 
                   />
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex justify-center items-center gap-6">
                <button 
                  onClick={prevTrack}
                  className="text-emerald-500 hover:text-emerald-300 transition-colors hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                >
                  <SkipBack className="w-6 h-6" fill="currentColor" />
                </button>
                
                <button 
                  onClick={togglePlay} 
                  className="w-14 h-14 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/50 rounded-full hover:bg-emerald-500/20 hover:border-emerald-400 transition-all shadow-[0_0_15px_rgba(52,211,153,0.2)] hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] group-hover:scale-105"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-emerald-400" fill="currentColor" />
                  ) : (
                    <Play className="w-6 h-6 text-emerald-400 ml-1" fill="currentColor" />
                  )}
                </button>
                
                <button 
                  onClick={nextTrack}
                  className="text-emerald-500 hover:text-emerald-300 transition-colors hover:drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                >
                  <SkipForward className="w-6 h-6" fill="currentColor" />
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center text-xs text-neutral-500 mt-2">
            <p>Press <kbd className="px-1 py-0.5 bg-neutral-800 rounded border border-neutral-700 text-neutral-400">SPACE</kbd> to pause</p>
          </div>

        </div>
      </div>
    </div>
  );
}

