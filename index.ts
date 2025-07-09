import * as THREE from 'three';

interface ControlPanel {
  element: HTMLElement;
  controls: { [key: string]: HTMLInputElement };
}

interface NodeData {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetPosition: THREE.Vector3;
  connections: THREE.Line[];
  activity: number;
  baseColor: THREE.Color;
  mass: number;
  restitution: number; // Bounciness factor (0 = no bounce, 1 = perfect bounce)
  friction: number; // Surface friction
  angularVelocity: THREE.Vector3;
  lastCollisionTime: number;
}

interface ParticleData {
  mesh: THREE.Mesh;
  startNode: NodeData;
  endNode: NodeData;
  progress: number;
  speed: number;
  lifespan: number;
  age: number;
}

interface RippleData {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  age: number;
  maxAge: number;
  maxRadius: number;
  wallType: string;
}

interface PresetData {
  name: string;
  nodeCount: number;
  nodeSpeed: number;
  activitySpeed: number;
  connectionOpacity: number;
  spaceSize: number;
  mouseInfluenceRadius: number;
  backgroundColor: string;
  nodeColor: string;
  connectionColor: string;
  showAllConnections: boolean;
  particleCount: number;
  particleSpeed: number;
  particleSize: number;
  particleColor: string;
  showParticles: boolean;
  rippleIntensity: number;
  rippleDuration: number;
  rippleSize: number;
  rippleColor: string;
  showRipples: boolean;
  wallRestitution: number;
  wallFriction: number;
}

class NeuralNetworkAnimation {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private nodes: NodeData[] = [];
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private controlPanel!: ControlPanel;
  private connectionLines: THREE.Group = new THREE.Group();
  private boxEnvironment: THREE.Group = new THREE.Group();
  private particles: ParticleData[] = [];
  private particleGroup: THREE.Group = new THREE.Group();
  private ripples: RippleData[] = [];
  private rippleGroup: THREE.Group = new THREE.Group();
  
  // Animation parameters
  private nodeCount: number = 12;
  private connectionOpacity: number = 0.3;
  private nodeSpeed: number = 0.5;
  private activitySpeed: number = 2.0;
  private spaceSize: number = 15;
  private mouseInfluenceRadius: number = 5.0;
  private backgroundColor: string = '#0a0a1a';
  private nodeColor: string = '#ff6b6b';
  private connectionColor: string = '#4fc3f7';
  private showAllConnections: boolean = true;
  private particleCount: number = 8;
  private particleSpeed: number = 1.0;
  private particleSize: number = 0.2;
  private particleColor: string = '#ffff00';
  private showParticles: boolean = true;
  private rippleIntensity: number = 0.8;
  private rippleDuration: number = 2.0;
  private rippleSize: number = 1.0;
  private rippleColor: string = '#ffffff';
  private showRipples: boolean = true;
  private gravity: number = 0.0;
  private airResistance: number = 0.98;
  private wallRestitution: number = 0.7;
  private wallFriction: number = 0.95;
  private availablePresets: string[] = [];
  private currentPresetName: string = 'Default';
  
  // Time tracking
  private clock: THREE.Clock = new THREE.Clock();
  
  constructor() {
    this.init();
    this.createControlPanel();
    this.createNodes();
    this.setupEventListeners();
    this.loadDefaultPreset();
    this.animate();
  }
  
  private init(): void {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.backgroundColor);
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 25;
    
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);
    
    // Add connection lines group
    this.scene.add(this.connectionLines);
    
    // Add particle group
    this.scene.add(this.particleGroup);
    
    // Add ripple group
    this.scene.add(this.rippleGroup);
    
    // Add box environment group
    this.scene.add(this.boxEnvironment);
    
    // Create the box environment
    this.createBoxEnvironment();
  }
  
  private createBoxEnvironment(): void {
    // Calculate box dimensions based on camera frustum
    const depth = 20;
    const fov = this.camera.fov * Math.PI / 180;
    const aspect = this.camera.aspect;
    const height = 2 * Math.tan(fov / 2) * depth;
    const width = height * aspect;
    
    const boxWidth = width;
    const boxHeight = height;
    const boxDepth = depth * 0.8;
    
    // Create wireframe material for grid lines
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x444444,
      opacity: 0.6,
      transparent: true
    });
    
    // Create solid material for walls
    const wallMaterial = new THREE.MeshBasicMaterial({
      color: 0x111111,
      opacity: 0.1,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // Floor grid
    this.createGridPlane(boxWidth, boxDepth, -boxHeight/2, 'floor', gridMaterial, wallMaterial);
    
    // Ceiling grid
    this.createGridPlane(boxWidth, boxDepth, boxHeight/2, 'ceiling', gridMaterial, wallMaterial);
    
    // Left wall grid
    this.createGridPlane(boxDepth, boxHeight, -boxWidth/2, 'left', gridMaterial, wallMaterial);
    
    // Right wall grid
    this.createGridPlane(boxDepth, boxHeight, boxWidth/2, 'right', gridMaterial, wallMaterial);
    
    // Back wall grid
    this.createGridPlane(boxWidth, boxHeight, -boxDepth/2, 'back', gridMaterial, wallMaterial);
  }
  
  private createGridPlane(width: number, height: number, position: number, type: string, gridMaterial: THREE.LineBasicMaterial, wallMaterial: THREE.MeshBasicMaterial): void {
    const gridSize = 2; // Grid cell size
    const gridGroup = new THREE.Group();
    
    // Create solid plane background
    let planeGeometry: THREE.PlaneGeometry;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMaterial);
    
    // Position and rotate plane based on type
    switch(type) {
      case 'floor':
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = position;
        break;
      case 'ceiling':
        plane.rotation.x = Math.PI / 2;
        plane.position.y = position;
        break;
      case 'left':
        plane.rotation.y = Math.PI / 2;
        plane.position.x = position;
        break;
      case 'right':
        plane.rotation.y = -Math.PI / 2;
        plane.position.x = position;
        break;
      case 'back':
        plane.position.z = position;
        break;
    }
    
    gridGroup.add(plane);
    
    // Create grid lines
    const gridLines: THREE.Vector3[] = [];
    
    // Vertical lines
    for (let i = -width/2; i <= width/2; i += gridSize) {
      gridLines.push(new THREE.Vector3(i, -height/2, 0));
      gridLines.push(new THREE.Vector3(i, height/2, 0));
    }
    
    // Horizontal lines
    for (let i = -height/2; i <= height/2; i += gridSize) {
      gridLines.push(new THREE.Vector3(-width/2, i, 0));
      gridLines.push(new THREE.Vector3(width/2, i, 0));
    }
    
    // Create line segments
    for (let i = 0; i < gridLines.length; i += 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints([gridLines[i], gridLines[i + 1]]);
      const line = new THREE.Line(geometry, gridMaterial);
      
      // Apply same transformations as the plane
      switch(type) {
        case 'floor':
          line.rotation.x = -Math.PI / 2;
          line.position.y = position;
          break;
        case 'ceiling':
          line.rotation.x = Math.PI / 2;
          line.position.y = position;
          break;
        case 'left':
          line.rotation.y = Math.PI / 2;
          line.position.x = position;
          break;
        case 'right':
          line.rotation.y = -Math.PI / 2;
          line.position.x = position;
          break;
        case 'back':
          line.position.z = position;
          break;
      }
      
      gridGroup.add(line);
    }
    
    this.boxEnvironment.add(gridGroup);
  }
  
  private createControlPanel(): void {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 1000;
      min-width: 280px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: transform 0.3s ease, opacity 0.3s ease;
    `;
    
    // Create header with title and collapse button
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Neural Network Controls';
    title.style.cssText = 'margin: 0; color: #4fc3f7; flex: 1;';
    
    const collapseButton = document.createElement('button');
    collapseButton.textContent = '−';
    collapseButton.style.cssText = `
      background: #4fc3f7;
      color: white;
      border: none;
      border-radius: 50%;
      width: 25px;
      height: 25px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 10px;
    `;
    
    header.appendChild(title);
    header.appendChild(collapseButton);
    panel.appendChild(header);
    
    // Create content container
    const content = document.createElement('div');
    content.style.cssText = 'transition: max-height 0.3s ease, opacity 0.3s ease; overflow: hidden;';
    
    const controls: { [key: string]: HTMLInputElement } = {};
    
    // Helper function to create compact slider controls
    const createSlider = (label: string, min: number, max: number, step: number, value: number, callback: (value: number) => void) => {
      const container = document.createElement('div');
      container.style.cssText = 'margin-bottom: 8px;';
      
      const labelContainer = document.createElement('div');
      labelContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;';
      
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.style.cssText = 'color: #e0e0e0; font-size: 12px;';
      
      const valueDisplay = document.createElement('span');
      valueDisplay.textContent = value.toFixed(2);
      valueDisplay.style.cssText = 'color: #4fc3f7; font-size: 12px; min-width: 35px; text-align: right;';
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = min.toString();
      slider.max = max.toString();
      slider.step = step.toString();
      slider.value = value.toString();
      slider.style.cssText = `
        width: 100%;
        height: 4px;
        background: #333;
        outline: none;
        border-radius: 2px;
        -webkit-appearance: none;
      `;
      
      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        valueDisplay.textContent = val.toFixed(2);
        callback(val);
      });
      
      labelContainer.appendChild(labelEl);
      labelContainer.appendChild(valueDisplay);
      container.appendChild(labelContainer);
      container.appendChild(slider);
      content.appendChild(container);
      
      return slider;
    };
    
    // Helper function to create compact color picker
    const createColorPicker = (label: string, value: string, callback: (value: string) => void) => {
      const container = document.createElement('div');
      container.style.cssText = 'margin-bottom: 8px;';
      
      const labelContainer = document.createElement('div');
      labelContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;';
      
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      labelEl.style.cssText = 'color: #e0e0e0; font-size: 12px;';
      
      const colorPicker = document.createElement('input');
      colorPicker.type = 'color';
      colorPicker.value = value;
      colorPicker.style.cssText = 'width: 35px; height: 20px; border: none; border-radius: 3px; cursor: pointer;';
      
      colorPicker.addEventListener('change', () => {
        callback(colorPicker.value);
      });
      
      labelContainer.appendChild(labelEl);
      labelContainer.appendChild(colorPicker);
      container.appendChild(labelContainer);
      content.appendChild(container);
      
      return colorPicker;
    };
    
    // Create all the controls in a more compact layout
    controls.nodeCount = createSlider('Nodes', 5, 25, 1, this.nodeCount, (val) => {
      this.nodeCount = Math.floor(val);
      this.recreateNodes();
    });
    
    controls.nodeSpeed = createSlider('Node Speed', 0, 2, 0.1, this.nodeSpeed, (val) => this.nodeSpeed = val);
    controls.activitySpeed = createSlider('Activity', 0.5, 5, 0.1, this.activitySpeed, (val) => this.activitySpeed = val);
    controls.connectionOpacity = createSlider('Connections', 0, 1, 0.05, this.connectionOpacity, (val) => this.connectionOpacity = val);
    controls.mouseInfluenceRadius = createSlider('Mouse Range', 2, 15, 0.5, this.mouseInfluenceRadius, (val) => this.mouseInfluenceRadius = val);
    
    // Particle controls
    controls.particleCount = createSlider('Particles', 0, 20, 1, this.particleCount, (val) => {
      this.particleCount = Math.floor(val);
      this.updateParticleCount();
    });
    controls.particleSpeed = createSlider('Particle Speed', 0.1, 3, 0.1, this.particleSpeed, (val) => this.particleSpeed = val);
    controls.particleSize = createSlider('Particle Size', 0.05, 0.5, 0.05, this.particleSize, (val) => {
      this.particleSize = val;
      this.updateParticleSize();
    });
    
    // Ripple controls
    controls.rippleIntensity = createSlider('Ripple Intensity', 0, 2, 0.1, this.rippleIntensity, (val) => this.rippleIntensity = val);
    controls.rippleDuration = createSlider('Ripple Duration', 0.5, 5, 0.1, this.rippleDuration, (val) => this.rippleDuration = val);
    controls.rippleSize = createSlider('Ripple Size', 0.2, 3, 0.1, this.rippleSize, (val) => this.rippleSize = val);
    
    // Physics controls
    controls.wallRestitution = createSlider('Wall Bounce', 0.1, 1.0, 0.05, this.wallRestitution, (val) => this.wallRestitution = val);
    controls.wallFriction = createSlider('Wall Friction', 0.8, 1.0, 0.01, this.wallFriction, (val) => this.wallFriction = val);
    
    // Color controls
    const nodeColorPicker = createColorPicker('Node Color', this.nodeColor, (val) => {
      this.nodeColor = val;
      this.updateNodeColors();
    });
    
    const connectionColorPicker = createColorPicker('Connection Color', this.connectionColor, (val) => {
      this.connectionColor = val;
      this.updateConnectionColors();
    });
    
    const particleColorPicker = createColorPicker('Particle Color', this.particleColor, (val) => {
      this.particleColor = val;
      this.updateParticleColors();
    });
    
    const rippleColorPicker = createColorPicker('Ripple Color', this.rippleColor, (val) => {
      this.rippleColor = val;
      this.updateRippleColors();
    });
    
    const backgroundColorPicker = createColorPicker('Background', this.backgroundColor, (val) => {
      this.backgroundColor = val;
      this.scene.background = new THREE.Color(this.backgroundColor);
    });
    
    // Toggle for showing all connections
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = 'margin-bottom: 15px;';
    
    const toggleLabel = document.createElement('label');
    toggleLabel.textContent = 'Show All Connections';
    toggleLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #e0e0e0;';
    
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = this.showAllConnections;
    toggle.style.cssText = 'transform: scale(1.5); margin-right: 10px;';
    
    toggle.addEventListener('change', () => {
      this.showAllConnections = toggle.checked;
      this.updateConnections();
    });
    
    toggleContainer.appendChild(toggleLabel);
    toggleContainer.appendChild(toggle);
    content.appendChild(toggleContainer);
    
    // Toggle for showing particles
    const particleToggleContainer = document.createElement('div');
    particleToggleContainer.style.cssText = 'margin-bottom: 15px;';
    
    const particleToggleLabel = document.createElement('label');
    particleToggleLabel.textContent = 'Show Particles';
    particleToggleLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #e0e0e0;';
    
    const particleToggle = document.createElement('input');
    particleToggle.type = 'checkbox';
    particleToggle.checked = this.showParticles;
    particleToggle.style.cssText = 'transform: scale(1.5); margin-right: 10px;';
    
    particleToggle.addEventListener('change', () => {
      this.showParticles = particleToggle.checked;
      this.updateParticleVisibility();
    });
    
    particleToggleContainer.appendChild(particleToggleLabel);
    particleToggleContainer.appendChild(particleToggle);
    content.appendChild(particleToggleContainer);
    
    // Toggle for showing ripples
    const rippleToggleContainer = document.createElement('div');
    rippleToggleContainer.style.cssText = 'margin-bottom: 15px;';
    
    const rippleToggleLabel = document.createElement('label');
    rippleToggleLabel.textContent = 'Show Ripples';
    rippleToggleLabel.style.cssText = 'display: block; margin-bottom: 5px; color: #e0e0e0;';
    
    const rippleToggle = document.createElement('input');
    rippleToggle.type = 'checkbox';
    rippleToggle.checked = this.showRipples;
    rippleToggle.style.cssText = 'transform: scale(1.5); margin-right: 10px;';
    
    rippleToggle.addEventListener('change', () => {
      this.showRipples = rippleToggle.checked;
      this.updateRippleVisibility();
    });
    
    rippleToggleContainer.appendChild(rippleToggleLabel);
    rippleToggleContainer.appendChild(rippleToggle);
    content.appendChild(rippleToggleContainer);
    
    // Reset button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to Defaults';
    resetButton.style.cssText = `
      width: 100%;
      padding: 10px;
      background: #4fc3f7;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 10px;
    `;
    
    resetButton.addEventListener('click', () => {
      this.nodeCount = 12;
      this.nodeSpeed = 0.5;
      this.activitySpeed = 2.0;
      this.connectionOpacity = 0.3;
      this.spaceSize = 15;
      this.mouseInfluenceRadius = 5.0;
      this.showAllConnections = true;
      this.backgroundColor = '#0a0a1a';
      this.nodeColor = '#ff6b6b';
      this.connectionColor = '#4fc3f7';
      this.particleCount = 8;
      this.particleSpeed = 1.0;
      this.particleSize = 0.2;
      this.particleColor = '#ffff00';
      this.showParticles = true;
      this.rippleIntensity = 0.8;
      this.rippleDuration = 2.0;
      this.rippleSize = 1.0;
      this.rippleColor = '#ffffff';
      this.showRipples = true;
      this.wallRestitution = 0.7;
      this.wallFriction = 0.95;
      
      // Update all controls
      controls.nodeCount.value = this.nodeCount.toString();
      controls.nodeSpeed.value = this.nodeSpeed.toString();
      controls.activitySpeed.value = this.activitySpeed.toString();
      controls.connectionOpacity.value = this.connectionOpacity.toString();
      controls.spaceSize.value = this.spaceSize.toString();
      controls.mouseInfluenceRadius.value = this.mouseInfluenceRadius.toString();
      controls.particleCount.value = this.particleCount.toString();
      controls.particleSpeed.value = this.particleSpeed.toString();
      controls.particleSize.value = this.particleSize.toString();
      controls.rippleIntensity.value = this.rippleIntensity.toString();
      controls.rippleDuration.value = this.rippleDuration.toString();
      controls.rippleSize.value = this.rippleSize.toString();
      controls.wallRestitution.value = this.wallRestitution.toString();
      controls.wallFriction.value = this.wallFriction.toString();
      toggle.checked = this.showAllConnections;
      particleToggle.checked = this.showParticles;
      rippleToggle.checked = this.showRipples;
      backgroundColorPicker.value = this.backgroundColor;
      nodeColorPicker.value = this.nodeColor;
      connectionColorPicker.value = this.connectionColor;
      particleColorPicker.value = this.particleColor;
      rippleColorPicker.value = this.rippleColor;
      
      // Update displays
      panel.querySelectorAll('span').forEach((span, index) => {
        const values = [this.nodeCount, this.nodeSpeed, this.activitySpeed, this.connectionOpacity, this.spaceSize, this.mouseInfluenceRadius, this.particleCount, this.particleSpeed, this.particleSize, this.rippleIntensity, this.rippleDuration, this.rippleSize, this.wallRestitution, this.wallFriction];
        if (index < values.length) {
          span.textContent = values[index].toFixed(2);
        }
      });
      
      this.scene.background = new THREE.Color(this.backgroundColor);
      this.updateNodeColors();
      this.updateConnectionColors();
      this.updateParticleColors();
      this.updateParticleVisibility();
      this.updateRippleColors();
      this.updateRippleVisibility();
      this.clearAllParticles();
      this.clearAllRipples();
      this.recreateNodes();
    });
    
    content.appendChild(resetButton);
    
    // Add content to panel
    panel.appendChild(content);
    
    // Add collapse functionality
    let isCollapsed = false;
    collapseButton.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      
      if (isCollapsed) {
        content.style.maxHeight = '0px';
        content.style.opacity = '0';
        collapseButton.textContent = '+';
        panel.style.minWidth = 'auto';
      } else {
        content.style.maxHeight = '1000px';
        content.style.opacity = '1';
        collapseButton.textContent = '−';
        panel.style.minWidth = '280px';
      }
    });
    
    // Set initial state
    content.style.maxHeight = '1000px';
    content.style.opacity = '1';
    
    document.body.appendChild(panel);
    
    // Create separate preset panel on the right
    this.createPresetPanel();
    
    this.controlPanel = { element: panel, controls };
  }
  
  private createNodes(): void {
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    
    // Calculate camera frustum dimensions at the desired depth to cover full screen
    const depth = 20; // Distance from camera where nodes will be placed
    const fov = this.camera.fov * Math.PI / 180;
    const aspect = this.camera.aspect;
    const height = 2 * Math.tan(fov / 2) * depth;
    const width = height * aspect;
    
    // Use full screen dimensions (no reduction factor)
    const positions = this.generatePoissonDiskSampling(this.nodeCount, width, height, depth * 0.8);
    
    for (let i = 0; i < this.nodeCount; i++) {
      // Create node material with the selected node color
      const baseColor = new THREE.Color(this.nodeColor);
      const material = new THREE.MeshLambertMaterial({ color: baseColor });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Use pre-calculated position or fallback to random
      const position = positions[i] || new THREE.Vector3(
        (Math.random() - 0.5) * width,
        (Math.random() - 0.5) * height,
        (Math.random() - 0.5) * depth * 0.8
      );
      
      mesh.position.copy(position);
      
      const nodeData: NodeData = {
        mesh,
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.2
        ),
        targetPosition: position.clone(),
        connections: [],
        activity: Math.random(),
        baseColor: baseColor.clone(),
        mass: 1.0 + Math.random() * 0.5, // Random mass between 1.0 and 1.5
        restitution: 0.6 + Math.random() * 0.3, // Random bounciness between 0.6 and 0.9
        friction: 0.9 + Math.random() * 0.1, // Random friction between 0.9 and 1.0
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        ),
        lastCollisionTime: 0
      };
      
      this.nodes.push(nodeData);
      this.scene.add(mesh);
    }
    
    this.updateConnections();
  }
  
  private generatePoissonDiskSampling(numPoints: number, width: number, height: number, depth: number): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const minDistance = Math.min(width, height, depth) / Math.sqrt(numPoints) * 0.8;
    const maxAttempts = 30;
    
    // Start with a random point
    if (numPoints > 0) {
      points.push(new THREE.Vector3(
        (Math.random() - 0.5) * width,
        (Math.random() - 0.5) * height,
        (Math.random() - 0.5) * depth
      ));
    }
    
    // Generate remaining points
    while (points.length < numPoints) {
      let placed = false;
      
      for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
        const candidate = new THREE.Vector3(
          (Math.random() - 0.5) * width,
          (Math.random() - 0.5) * height,
          (Math.random() - 0.5) * depth
        );
        
        // Check if candidate is far enough from existing points
        let validPosition = true;
        for (const existingPoint of points) {
          if (candidate.distanceTo(existingPoint) < minDistance) {
            validPosition = false;
            break;
          }
        }
        
        if (validPosition) {
          points.push(candidate);
          placed = true;
        }
      }
      
      // If we can't place a point after max attempts, reduce min distance slightly
      if (!placed) {
        const relaxedDistance = minDistance * 0.9;
        for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
          const candidate = new THREE.Vector3(
            (Math.random() - 0.5) * width,
            (Math.random() - 0.5) * height,
            (Math.random() - 0.5) * depth
          );
          
          let validPosition = true;
          for (const existingPoint of points) {
            if (candidate.distanceTo(existingPoint) < relaxedDistance) {
              validPosition = false;
              break;
            }
          }
          
          if (validPosition) {
            points.push(candidate);
            placed = true;
          }
        }
      }
      
      // Fallback: if still can't place, just add a random point
      if (!placed) {
        points.push(new THREE.Vector3(
          (Math.random() - 0.5) * width,
          (Math.random() - 0.5) * height,
          (Math.random() - 0.5) * depth
        ));
      }
    }
    
    return points;
  }
  
  private updateConnections(): void {
    // Clear existing connections
    this.connectionLines.clear();
    this.nodes.forEach(node => node.connections = []);
    
    if (!this.showAllConnections) return;
    
    // Create connections between all nodes
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i];
        const nodeB = this.nodes[j];
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
          nodeA.position,
          nodeB.position
        ]);
        
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(this.connectionColor),
          opacity: this.connectionOpacity,
          transparent: true
        });
        
        const line = new THREE.Line(geometry, material);
        nodeA.connections.push(line);
        this.connectionLines.add(line);
      }
    }
  }
  
  private updateNodeColors(): void {
    const newColor = new THREE.Color(this.nodeColor);
    this.nodes.forEach(node => {
      node.baseColor = newColor.clone();
      (node.mesh.material as THREE.MeshLambertMaterial).color.copy(newColor);
    });
  }
  
  private updateConnectionColors(): void {
    const newColor = new THREE.Color(this.connectionColor);
    this.connectionLines.children.forEach(child => {
      const line = child as THREE.Line;
      (line.material as THREE.LineBasicMaterial).color.copy(newColor);
    });
  }
  
  private createRipple(position: THREE.Vector3, normal: THREE.Vector3, wallType: string): RippleData {
    const rippleRadius = 4.0 * this.rippleIntensity * this.rippleSize;
    
    // Create a more blurred, soft ripple using a circle with gradient
    const geometry = new THREE.CircleGeometry(0.1, 32);
    
    // Create a custom shader material for a soft, blurred glow effect
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.rippleColor) },
        opacity: { value: 0.6 },
        radius: { value: 0.1 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        uniform float radius;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          float dist = distance(vUv, center);
          
          // Create a soft falloff with multiple layers for blur effect
          float alpha1 = 1.0 - smoothstep(0.0, 0.3, dist);
          float alpha2 = 1.0 - smoothstep(0.1, 0.5, dist);
          float alpha3 = 1.0 - smoothstep(0.3, 0.8, dist);
          
          float finalAlpha = (alpha1 * 0.6 + alpha2 * 0.3 + alpha3 * 0.1) * opacity;
          
          gl_FragColor = vec4(color, finalAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending // Additive blending for glow effect
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    
    // Orient the ripple based on the wall normal
    if (wallType === 'floor' || wallType === 'ceiling') {
      mesh.rotation.x = wallType === 'floor' ? -Math.PI / 2 : Math.PI / 2;
    } else if (wallType === 'left' || wallType === 'right') {
      mesh.rotation.y = wallType === 'left' ? Math.PI / 2 : -Math.PI / 2;
    }
    // back wall needs no rotation (default orientation)
    
    this.rippleGroup.add(mesh);
    
    return {
      mesh,
      position: position.clone(),
      normal: normal.clone(),
      age: 0,
      maxAge: this.rippleDuration,
      maxRadius: rippleRadius,
      wallType
    };
  }

  private createParticle(startNode: NodeData, endNode: NodeData): ParticleData {
    const geometry = new THREE.SphereGeometry(this.particleSize, 8, 6);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.particleColor),
      transparent: true,
      opacity: 1.0
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(startNode.position);
    this.particleGroup.add(mesh);
    
    return {
      mesh,
      startNode,
      endNode,
      progress: 0,
      speed: this.particleSpeed * (0.5 + Math.random() * 0.5), // Random speed variation
      lifespan: 3.0, // 3 seconds lifespan
      age: 0
    };
  }
  
  private updateParticles(): void {
    const deltaTime = 1/60; // Fixed 60 FPS delta time for consistent behavior
    
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.age += deltaTime;
      particle.progress += particle.speed * deltaTime;
      
      // Remove particles that have completed their journey or exceeded lifespan
      if (particle.progress >= 1.0 || particle.age >= particle.lifespan) {
        this.particleGroup.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        (particle.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      
      // Update particle position along the connection line
      const startPos = particle.startNode.position;
      const endPos = particle.endNode.position;
      particle.mesh.position.lerpVectors(startPos, endPos, particle.progress);
      
      // Fade out particle as it ages
      const fadeProgress = particle.age / particle.lifespan;
      const opacity = 0.8 * (1 - fadeProgress * fadeProgress);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
    
    // Create new particles based on node activity
    if (this.showParticles && this.nodes.length > 1) {
      const totalConnections = (this.nodes.length * (this.nodes.length - 1)) / 2;
      const spawnProbability = (this.particleCount * deltaTime * 2) / totalConnections; // Increased spawn rate
      
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const nodeA = this.nodes[i];
          const nodeB = this.nodes[j];
          
          // Higher activity nodes are more likely to spawn particles
          const activityFactor = Math.max(0.3, (nodeA.activity + nodeB.activity) * 0.5); // Minimum activity
          const finalProbability = spawnProbability * activityFactor;
          
          if (Math.random() < finalProbability) {
            // Randomly choose direction
            const startNode = Math.random() < 0.5 ? nodeA : nodeB;
            const endNode = startNode === nodeA ? nodeB : nodeA;
            this.particles.push(this.createParticle(startNode, endNode));
          }
        }
      }
    }
  }
  
  private updateRipples(): void {
    const deltaTime = 1/60; // Fixed 60 FPS delta time for consistent behavior
    
    // Update existing ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.age += deltaTime;
      
      // Remove ripples that have exceeded their lifespan
      if (ripple.age >= ripple.maxAge) {
        this.rippleGroup.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        (ripple.mesh.material as THREE.Material).dispose();
        this.ripples.splice(i, 1);
        continue;
      }
      
      // Update ripple size and opacity
      const progress = ripple.age / ripple.maxAge;
      const currentScale = ripple.maxRadius * progress;
      const opacity = 0.6 * (1 - progress * progress * progress); // Fade out with cubic curve for softer transition
      
      // Scale the mesh to expand the ripple
      ripple.mesh.scale.setScalar(currentScale);
      
      // Update shader material opacity
      const material = ripple.mesh.material as THREE.ShaderMaterial;
      material.uniforms.opacity.value = opacity;
      material.uniforms.radius.value = currentScale;
    }
  }

  private updateParticleCount(): void {
    // This method is called when particle count changes
    // The actual particle spawning is handled in updateParticles()
  }
  
  private updateParticleSize(): void {
    // Update size of existing particles
    this.particles.forEach(particle => {
      particle.mesh.scale.setScalar(this.particleSize / 0.2); // 0.2 is the base size
    });
  }
  
  private updateParticleColors(): void {
    const newColor = new THREE.Color(this.particleColor);
    this.particles.forEach(particle => {
      (particle.mesh.material as THREE.MeshBasicMaterial).color.copy(newColor);
    });
  }
  
  private updateParticleVisibility(): void {
    this.particleGroup.visible = this.showParticles;
    if (!this.showParticles) {
      // Clear all particles when disabled
      this.clearAllParticles();
    }
  }
  
  private updateRippleColors(): void {
    const newColor = new THREE.Color(this.rippleColor);
    this.ripples.forEach(ripple => {
      const material = ripple.mesh.material as THREE.ShaderMaterial;
      material.uniforms.color.value.copy(newColor);
    });
  }
  
  private updateRippleVisibility(): void {
    this.rippleGroup.visible = this.showRipples;
    if (!this.showRipples) {
      // Clear all ripples when disabled
      this.clearAllRipples();
    }
  }
  
  private clearAllRipples(): void {
    this.ripples.forEach(ripple => {
      this.rippleGroup.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      (ripple.mesh.material as THREE.Material).dispose();
    });
    this.ripples = [];
  }

  private clearAllParticles(): void {
    this.particles.forEach(particle => {
      this.particleGroup.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];
  }

  private getCurrentPreset(): PresetData {
    return {
      name: this.currentPresetName,
      nodeCount: this.nodeCount,
      nodeSpeed: this.nodeSpeed,
      activitySpeed: this.activitySpeed,
      connectionOpacity: this.connectionOpacity,
      spaceSize: this.spaceSize,
      mouseInfluenceRadius: this.mouseInfluenceRadius,
      backgroundColor: this.backgroundColor,
      nodeColor: this.nodeColor,
      connectionColor: this.connectionColor,
      showAllConnections: this.showAllConnections,
      particleCount: this.particleCount,
      particleSpeed: this.particleSpeed,
      particleSize: this.particleSize,
      particleColor: this.particleColor,
      showParticles: this.showParticles,
      rippleIntensity: this.rippleIntensity,
      rippleDuration: this.rippleDuration,
      rippleSize: this.rippleSize,
      rippleColor: this.rippleColor,
      showRipples: this.showRipples,
      wallRestitution: this.wallRestitution,
      wallFriction: this.wallFriction
    };
  }

  private applyPreset(preset: PresetData): void {
    this.currentPresetName = preset.name;
    this.nodeCount = preset.nodeCount;
    this.nodeSpeed = preset.nodeSpeed;
    this.activitySpeed = preset.activitySpeed;
    this.connectionOpacity = preset.connectionOpacity;
    this.spaceSize = preset.spaceSize;
    this.mouseInfluenceRadius = preset.mouseInfluenceRadius;
    this.backgroundColor = preset.backgroundColor;
    this.nodeColor = preset.nodeColor;
    this.connectionColor = preset.connectionColor;
    this.showAllConnections = preset.showAllConnections;
    this.particleCount = preset.particleCount;
    this.particleSpeed = preset.particleSpeed;
    this.particleSize = preset.particleSize;
    this.particleColor = preset.particleColor;
    this.showParticles = preset.showParticles;
    this.rippleIntensity = preset.rippleIntensity;
    this.rippleDuration = preset.rippleDuration;
    this.rippleSize = preset.rippleSize;
    this.rippleColor = preset.rippleColor;
    this.showRipples = preset.showRipples;
    this.wallRestitution = preset.wallRestitution;
    this.wallFriction = preset.wallFriction;

    // Update visual elements
    this.scene.background = new THREE.Color(this.backgroundColor);
    this.updateNodeColors();
    this.updateConnectionColors();
    this.updateParticleColors();
    this.updateParticleVisibility();
    this.updateRippleColors();
    this.updateRippleVisibility();
    this.clearAllParticles();
    this.clearAllRipples();
    this.recreateNodes();
  }

  private savePreset(name: string): void {
    const preset = this.getCurrentPreset();
    preset.name = name;
    
    const jsonData = JSON.stringify(preset, null, 2);
    
    // Create a modal to show the JSON and instructions
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: #222;
      color: white;
      padding: 20px;
      border-radius: 10px;
      max-width: 600px;
      max-height: 80%;
      overflow-y: auto;
      font-family: Arial, sans-serif;
    `;
    
    const title = document.createElement('h3');
    title.textContent = `Save Preset: ${name}`;
    title.style.cssText = 'margin: 0 0 15px 0; color: #4fc3f7;';
    
    const instructions = document.createElement('p');
    instructions.innerHTML = `
      Copy the JSON below and save it as <strong>${name}.json</strong> in the <strong>presets</strong> folder, then refresh the page to see it in the dropdown.
    `;
    instructions.style.cssText = 'margin-bottom: 15px; line-height: 1.4;';
    
    const textarea = document.createElement('textarea');
    textarea.value = jsonData;
    textarea.style.cssText = `
      width: 100%;
      height: 300px;
      background: #333;
      color: white;
      border: 1px solid #555;
      border-radius: 5px;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      resize: vertical;
    `;
    textarea.readOnly = true;
    textarea.select();
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top: 15px; text-align: right;';
    
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy to Clipboard';
    copyButton.style.cssText = `
      background: #4fc3f7;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
      margin-right: 10px;
    `;
    
    copyButton.addEventListener('click', () => {
      textarea.select();
      document.execCommand('copy');
      copyButton.textContent = 'Copied!';
      setTimeout(() => {
        copyButton.textContent = 'Copy to Clipboard';
      }, 2000);
    });
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
      background: #666;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 5px;
      cursor: pointer;
    `;
    
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(closeButton);
    
    content.appendChild(title);
    content.appendChild(instructions);
    content.appendChild(textarea);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    document.body.appendChild(modal);
    
    console.log(`Preset "${name}" JSON generated. Save to presets folder and refresh page.`);
  }

  private loadPresetFromFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const preset: PresetData = JSON.parse(e.target?.result as string);
        this.applyPreset(preset);
        this.updateControlPanel();
        console.log(`Preset "${preset.name}" loaded successfully`);
      } catch (error) {
        console.error('Error loading preset:', error);
        alert('Error loading preset file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }

  private updateControlPanel(): void {
    // This method will update all control panel values after loading a preset
    const panel = this.controlPanel.element;
    const controls = this.controlPanel.controls;
    
    // Update all slider values
    if (controls.nodeCount) controls.nodeCount.value = this.nodeCount.toString();
    if (controls.nodeSpeed) controls.nodeSpeed.value = this.nodeSpeed.toString();
    if (controls.activitySpeed) controls.activitySpeed.value = this.activitySpeed.toString();
    if (controls.connectionOpacity) controls.connectionOpacity.value = this.connectionOpacity.toString();
    if (controls.mouseInfluenceRadius) controls.mouseInfluenceRadius.value = this.mouseInfluenceRadius.toString();
    if (controls.particleCount) controls.particleCount.value = this.particleCount.toString();
    if (controls.particleSpeed) controls.particleSpeed.value = this.particleSpeed.toString();
    if (controls.particleSize) controls.particleSize.value = this.particleSize.toString();
    if (controls.rippleIntensity) controls.rippleIntensity.value = this.rippleIntensity.toString();
    if (controls.rippleDuration) controls.rippleDuration.value = this.rippleDuration.toString();
    if (controls.rippleSize) controls.rippleSize.value = this.rippleSize.toString();
    if (controls.wallRestitution) controls.wallRestitution.value = this.wallRestitution.toString();
    if (controls.wallFriction) controls.wallFriction.value = this.wallFriction.toString();
    
    // Update color pickers
    const colorPickers = panel.querySelectorAll('input[type="color"]');
    colorPickers.forEach((picker, index) => {
      const colors = [this.nodeColor, this.connectionColor, this.particleColor, this.rippleColor, this.backgroundColor];
      if (index < colors.length) {
        (picker as HTMLInputElement).value = colors[index];
      }
    });
    
    // Update checkboxes
    const checkboxes = panel.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
      const values = [this.showAllConnections, this.showParticles, this.showRipples];
      if (index < values.length) {
        (checkbox as HTMLInputElement).checked = values[index];
      }
    });
    
    // Update value displays
    panel.querySelectorAll('span').forEach((span, index) => {
      const values = [this.nodeCount, this.nodeSpeed, this.activitySpeed, this.connectionOpacity, this.spaceSize, this.mouseInfluenceRadius, this.particleCount, this.particleSpeed, this.particleSize, this.rippleIntensity, this.rippleDuration, this.rippleSize, this.wallRestitution, this.wallFriction];
      if (index < values.length) {
        span.textContent = values[index].toFixed(2);
      }
    });
  }

  private createPresetPanel(): void {
    const presetPanel = document.createElement('div');
    presetPanel.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 10px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 1000;
      min-width: 200px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Presets';
    title.style.cssText = 'margin: 0 0 15px 0; color: #4fc3f7;';
    presetPanel.appendChild(title);
    
    // Preset dropdown
    const dropdownContainer = document.createElement('div');
    dropdownContainer.style.cssText = 'margin-bottom: 10px;';
    
    const dropdown = document.createElement('select');
    dropdown.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #333;
      color: white;
      border: 1px solid #555;
      border-radius: 3px;
      font-size: 12px;
      cursor: pointer;
    `;
    
    // Add preset options - try to load all known presets
    const defaultPresets = [
      { name: 'Default', file: 'Default.json' },
      { name: 'Calm Ocean', file: 'Calm Ocean.json' },
      { name: 'Electric Storm', file: 'Electric Storm.json' },
      { name: 'Dark Magic', file: 'Dark Magic.json' }
    ];
    
    // Load presets dynamically
    this.loadAvailablePresets(dropdown, defaultPresets);
    
    dropdown.addEventListener('change', () => {
      if (dropdown.value === 'REFRESH') {
        // Clear dropdown and reload presets
        dropdown.innerHTML = '';
        const defaultPresets = [
          { name: 'Default', file: 'Default.json' },
          { name: 'Calm Ocean', file: 'Calm Ocean.json' },
          { name: 'Electric Storm', file: 'Electric Storm.json' },
          { name: 'Dark Magic', file: 'Dark Magic.json' }
        ];
        this.loadAvailablePresets(dropdown, defaultPresets);
        dropdown.value = ''; // Reset selection
      } else if (dropdown.value) {
        this.loadPresetFromPath(`./presets/${dropdown.value}`);
      }
    });
    
    dropdownContainer.appendChild(dropdown);
    presetPanel.appendChild(dropdownContainer);
    
    // Save preset section
    const saveContainer = document.createElement('div');
    saveContainer.style.cssText = 'margin-bottom: 10px;';
    
    const saveInput = document.createElement('input');
    saveInput.type = 'text';
    saveInput.placeholder = 'Preset name...';
    saveInput.style.cssText = `
      width: 100%;
      padding: 5px;
      background: #333;
      color: white;
      border: 1px solid #555;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 5px;
    `;
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Preset';
    saveButton.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #4fc3f7;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    
    saveButton.addEventListener('click', () => {
      const name = saveInput.value.trim();
      if (name) {
        this.savePreset(name);
        saveInput.value = '';
      } else {
        alert('Please enter a preset name');
      }
    });
    
    saveContainer.appendChild(saveInput);
    saveContainer.appendChild(saveButton);
    presetPanel.appendChild(saveContainer);
    
    // Load custom preset section
    const loadContainer = document.createElement('div');
    
    const loadInput = document.createElement('input');
    loadInput.type = 'file';
    loadInput.accept = '.json';
    loadInput.style.cssText = 'display: none;';
    
    const loadButton = document.createElement('button');
    loadButton.textContent = 'Load Custom';
    loadButton.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #666;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    
    loadButton.addEventListener('click', () => {
      loadInput.click();
    });
    
    loadInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadPresetFromFile(file);
      }
    });
    
    loadContainer.appendChild(loadInput);
    loadContainer.appendChild(loadButton);
    presetPanel.appendChild(loadContainer);
    
    document.body.appendChild(presetPanel);
  }

  private async loadPresetFromPath(path: string): Promise<void> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load preset: ${response.statusText}`);
      }
      const preset: PresetData = await response.json();
      this.applyPreset(preset);
      this.updateControlPanel();
      console.log(`Preset "${preset.name}" loaded successfully`);
    } catch (error) {
      console.error('Error loading preset:', error);
      alert('Error loading preset. Please check if the file exists.');
    }
  }

  private async loadDefaultPreset(): Promise<void> {
    try {
      await this.loadPresetFromPath('./presets/Default.json');
    } catch (error) {
      console.log('Default preset not found, using built-in defaults');
      // If Default.json doesn't exist, the current hardcoded values will be used
    }
  }

  private async loadAvailablePresets(dropdown: HTMLSelectElement, knownPresets: {name: string, file: string}[]): Promise<void> {
    // First, add all known presets
    for (const preset of knownPresets) {
      try {
        const response = await fetch(`./presets/${preset.file}`, { method: 'HEAD' });
        if (response.ok) {
          const option = document.createElement('option');
          option.value = preset.file;
          option.textContent = preset.name;
          dropdown.appendChild(option);
        }
      } catch (error) {
        console.log(`Preset ${preset.file} not found, skipping`);
      }
    }

    // Try to find additional presets by checking common naming patterns
    const additionalPresets = [
      'Neon Glow.json',
      'Minimal.json',
      'Chaos.json',
      'Zen.json',
      'Matrix.json',
      'Sunset.json',
      'Arctic.json',
      'Forest.json',
      'Space.json',
      'Fire.json'
    ];

    for (const filename of additionalPresets) {
      // Skip if already in known presets
      if (knownPresets.some(p => p.file === filename)) continue;
      
      try {
        const response = await fetch(`./presets/${filename}`, { method: 'HEAD' });
        if (response.ok) {
          // Get preset name from filename
          const name = filename.replace('.json', '');
          const option = document.createElement('option');
          option.value = filename;
          option.textContent = name;
          dropdown.appendChild(option);
          console.log(`Found additional preset: ${name}`);
        }
      } catch (error) {
        // Silently skip missing files
      }
    }

    // Add a refresh option to manually check for new presets
    const refreshOption = document.createElement('option');
    refreshOption.value = 'REFRESH';
    refreshOption.textContent = '🔄 Refresh Presets';
    refreshOption.style.fontStyle = 'italic';
    dropdown.appendChild(refreshOption);
  }
  
  private recreateNodes(): void {
    // Clear existing nodes
    this.nodes.forEach(node => {
      this.scene.remove(node.mesh);
      node.mesh.geometry.dispose();
      (node.mesh.material as THREE.Material).dispose();
    });
    this.nodes = [];
    
    // Create new nodes
    this.createNodes();
  }
  
  private setupEventListeners(): void {
    // Mouse movement
    window.addEventListener('mousemove', (event) => {
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });
    
    // Window resize
    window.addEventListener('resize', () => {
      this.onWindowResize();
    });
  }
  
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Recreate box environment for new screen size
    this.recreateBoxEnvironment();
  }
  
  private recreateBoxEnvironment(): void {
    // Clear existing box environment
    this.boxEnvironment.clear();
    
    // Recreate box environment with new dimensions
    this.createBoxEnvironment();
  }
  
  private updateNodes(): void {
    const time = this.clock.getElapsedTime();
    const deltaTime = 1/60; // Fixed 60 FPS delta time for consistent behavior
    
    // Update raycaster for mouse interaction
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    this.nodes.forEach((node, index) => {
      const { mesh, position, velocity, targetPosition, baseColor, mass, restitution, friction, angularVelocity } = node;
      
      // Update activity (neural firing simulation)
      node.activity = (Math.sin(time * this.activitySpeed + index) + 1) * 0.5;
      
      // Apply velocity to position (constant speed movement)
      position.add(velocity.clone().multiplyScalar(this.nodeSpeed));
      
      // Boundary constraints based on camera frustum - proper bouncing
      const depth = 20;
      const fov = this.camera.fov * Math.PI / 180;
      const aspect = this.camera.aspect;
      const height = 2 * Math.tan(fov / 2) * depth;
      const width = height * aspect;
      
      const boundaryX = width * 0.5;
      const boundaryY = height * 0.5;
      const boundaryZ = depth * 0.4;
      
      // Enhanced collision detection with realistic physics
      let collisionOccurred = false;
      const minTimeBetweenCollisions = 0.1; // Prevent multiple collisions in quick succession
      
      // X-axis collisions (left/right walls)
      if (position.x > boundaryX) {
        position.x = boundaryX;
        if (velocity.x > 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
          const impactSpeed = Math.abs(velocity.x);
          velocity.x = -velocity.x * (node.restitution * this.wallRestitution);
          velocity.y *= this.wallFriction;
          velocity.z *= this.wallFriction;
          
          // Add some random angular velocity from impact
          angularVelocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1
          ));
          
          node.lastCollisionTime = time;
          collisionOccurred = true;
          
          if (this.showRipples) {
            const ripplePos = new THREE.Vector3(boundaryX, position.y, position.z);
            const normal = new THREE.Vector3(-1, 0, 0);
            this.ripples.push(this.createRipple(ripplePos, normal, 'right'));
          }
        }
      } else if (position.x < -boundaryX) {
        position.x = -boundaryX;
        if (velocity.x < 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
          const impactSpeed = Math.abs(velocity.x);
          velocity.x = -velocity.x * (node.restitution * this.wallRestitution);
          velocity.y *= this.wallFriction;
          velocity.z *= this.wallFriction;
          
          angularVelocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1
          ));
          
          node.lastCollisionTime = time;
          collisionOccurred = true;
          
          if (this.showRipples) {
            const ripplePos = new THREE.Vector3(-boundaryX, position.y, position.z);
            const normal = new THREE.Vector3(1, 0, 0);
            this.ripples.push(this.createRipple(ripplePos, normal, 'left'));
          }
        }
      }
      
      // Y-axis collisions (floor/ceiling)
      if (position.y > boundaryY) {
        position.y = boundaryY;
        if (velocity.y > 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
          const impactSpeed = Math.abs(velocity.y);
          velocity.y = -velocity.y * (node.restitution * this.wallRestitution);
          velocity.x *= this.wallFriction;
          velocity.z *= this.wallFriction;
          
          angularVelocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1
          ));
          
          node.lastCollisionTime = time;
          collisionOccurred = true;
          
          if (this.showRipples) {
            const ripplePos = new THREE.Vector3(position.x, boundaryY, position.z);
            const normal = new THREE.Vector3(0, -1, 0);
            this.ripples.push(this.createRipple(ripplePos, normal, 'ceiling'));
          }
        }
      } else if (position.y < -boundaryY) {
        position.y = -boundaryY;
        if (velocity.y < 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
          const impactSpeed = Math.abs(velocity.y);
          velocity.y = -velocity.y * (node.restitution * this.wallRestitution);
          velocity.x *= this.wallFriction;
          velocity.z *= this.wallFriction;
          
          angularVelocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1
          ));
          
          node.lastCollisionTime = time;
          collisionOccurred = true;
          
          if (this.showRipples) {
            const ripplePos = new THREE.Vector3(position.x, -boundaryY, position.z);
            const normal = new THREE.Vector3(0, 1, 0);
            this.ripples.push(this.createRipple(ripplePos, normal, 'floor'));
          }
        }
      }
      
      // Z-axis collisions (front/back walls)
      if (position.z > boundaryZ) {
        position.z = boundaryZ;
        if (velocity.z > 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
          const impactSpeed = Math.abs(velocity.z);
          velocity.z = -velocity.z * (node.restitution * this.wallRestitution);
          velocity.x *= this.wallFriction;
          velocity.y *= this.wallFriction;
          
          angularVelocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1
          ));
          
          node.lastCollisionTime = time;
          collisionOccurred = true;
          // No ripple for front wall (camera side)
        }
      } else if (position.z < -boundaryZ) {
        position.z = -boundaryZ;
        if (velocity.z < 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
          const impactSpeed = Math.abs(velocity.z);
          velocity.z = -velocity.z * (node.restitution * this.wallRestitution);
          velocity.x *= this.wallFriction;
          velocity.y *= this.wallFriction;
          
          angularVelocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1,
            (Math.random() - 0.5) * impactSpeed * 0.1
          ));
          
          node.lastCollisionTime = time;
          collisionOccurred = true;
          
          if (this.showRipples) {
            const ripplePos = new THREE.Vector3(position.x, position.y, -boundaryZ);
            const normal = new THREE.Vector3(0, 0, 1);
            this.ripples.push(this.createRipple(ripplePos, normal, 'back'));
          }
        }
      }
      
      // Apply angular velocity damping
      angularVelocity.multiplyScalar(0.98);
      
      // Mouse interaction
      const intersects = this.raycaster.intersectObject(mesh);
      let mouseInfluence = 0;
      
      if (intersects.length > 0) {
        mouseInfluence = 1.0;
      } else {
        // Check distance to mouse in world space
        const worldMouse = new THREE.Vector3();
        worldMouse.unproject(this.camera);
        const direction = new THREE.Vector3();
        direction.subVectors(worldMouse, this.camera.position).normalize();
        const distance = this.camera.position.distanceTo(position);
        const mouseWorldPos = this.camera.position.clone().add(direction.multiplyScalar(distance));
        
        const distanceToMouse = position.distanceTo(mouseWorldPos);
        mouseInfluence = Math.max(0, 1 - distanceToMouse / this.mouseInfluenceRadius);
      }
      
      // Update node appearance based on activity and mouse interaction
      const activityIntensity = node.activity + mouseInfluence * 0.5;
      const scale = 1.0 + activityIntensity * 0.3;
      mesh.scale.setScalar(scale);
      
      // Update color based on activity
      const color = baseColor.clone();
      color.lerp(new THREE.Color(1, 1, 1), activityIntensity * 0.4);
      (mesh.material as THREE.MeshLambertMaterial).color.copy(color);
      
      // Update mesh position
      mesh.position.copy(position);
      
      // Apply angular velocity for realistic rotation
      mesh.rotation.x += angularVelocity.x;
      mesh.rotation.y += angularVelocity.y;
      mesh.rotation.z += angularVelocity.z;
      
      // Add gentle base rotation when not colliding
      if (!collisionOccurred) {
        mesh.rotation.x += 0.005 * this.nodeSpeed;
        mesh.rotation.y += 0.008 * this.nodeSpeed;
        mesh.rotation.z += 0.003 * this.nodeSpeed;
      }
    });
    
    // Update connection lines
    this.updateConnectionGeometry();
  }
  
  private updateConnectionGeometry(): void {
    let connectionIndex = 0;
    
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        if (connectionIndex < this.connectionLines.children.length) {
          const line = this.connectionLines.children[connectionIndex] as THREE.Line;
          const geometry = line.geometry as THREE.BufferGeometry;
          
          const positions = new Float32Array([
            this.nodes[i].position.x, this.nodes[i].position.y, this.nodes[i].position.z,
            this.nodes[j].position.x, this.nodes[j].position.y, this.nodes[j].position.z
          ]);
          
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          
          // Update line opacity based on node activity
          const avgActivity = (this.nodes[i].activity + this.nodes[j].activity) * 0.5;
          const material = line.material as THREE.LineBasicMaterial;
          material.opacity = this.connectionOpacity * (0.3 + avgActivity * 0.7);
        }
        connectionIndex++;
      }
    }
  }
  
  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    this.updateNodes();
    this.updateParticles();
    this.updateRipples();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize the animation when the page loads
window.addEventListener('DOMContentLoaded', () => {
  new NeuralNetworkAnimation();
});