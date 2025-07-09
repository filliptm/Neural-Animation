# Neural-Animation

A stunning 3D neural network visualization with animated particles, built with Three.js and TypeScript.

## Features

- **3D Neural Network**: Interactive bouncing nodes in a grid-lined box environment
- **Animated Particles**: Sparks travel along connection lines showing neural activity
- **Real-time Controls**: Comprehensive control panel for customization
- **Responsive Design**: Adapts to different screen sizes
- **Hot Reload**: Development server with auto-refresh

## Controls

### Node Settings
- **Node Count**: Adjust the number of neural nodes (5-25)
- **Node Speed**: Control movement speed of nodes (0-2)
- **Node Color**: Customize node appearance with color picker
- **Activity Speed**: Control neural firing animation speed (0.5-5)

### Connection Settings
- **Connection Opacity**: Adjust visibility of connection lines (0-1)
- **Connection Color**: Customize connection line colors
- **Show All Connections**: Toggle connection visibility

### Particle Effects
- **Particle Count**: Number of particles spawned (0-20)
- **Particle Speed**: Speed of particles traveling along connections (0.1-3)
- **Particle Size**: Size of animated sparks (0.05-0.5)
- **Show Particles**: Toggle particle effects on/off

### Environment
- **Space Size**: Adjust the 3D environment boundaries (10-30)
- **Mouse Radius**: Mouse interaction influence area (2-15)
- **Background Color**: Customize scene background

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Neural-Animation
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:8000`

## Development

The project uses:
- **Three.js**: 3D graphics and WebGL rendering
- **TypeScript**: Type-safe JavaScript development
- **Hot Reload**: Automatic browser refresh on code changes

### Project Structure
```
Neural-Animation/
├── index.html          # Main HTML file
├── index.ts            # Main TypeScript application
├── hot-reload.js       # Development hot reload script
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md          # This file
```

## Technical Features

### 3D Physics Simulation
- Bouncing collision detection with environment boundaries
- Realistic velocity-based movement
- Mouse interaction with proximity detection

### Particle System
- Dynamic particle spawning based on node activity
- Smooth interpolation along connection paths
- Automatic lifecycle management with fade effects

### Neural Network Visualization
- Poisson disk sampling for optimal node distribution
- Activity-based scaling and color changes
- Real-time connection geometry updates

### Performance Optimizations
- Efficient particle pooling and cleanup
- Optimized geometry updates
- Responsive camera frustum calculations

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Requires WebGL support for 3D rendering.

## License

MIT License - feel free to use this project for learning and development.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.