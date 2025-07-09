import * as THREE from 'three';
class NeuralNetworkAnimation {
    constructor() {
        this.nodes = [];
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.connectionLines = new THREE.Group();
        this.boxEnvironment = new THREE.Group();
        this.particles = [];
        this.particleGroup = new THREE.Group();
        this.ripples = [];
        this.rippleGroup = new THREE.Group();
        // Animation parameters
        this.nodeCount = 12;
        this.connectionOpacity = 0.3;
        this.nodeSpeed = 0.5;
        this.activitySpeed = 2.0;
        this.spaceSize = 15;
        this.mouseInfluenceRadius = 5.0;
        this.backgroundColor = '#0a0a1a';
        this.nodeColor = '#ff6b6b';
        this.connectionColor = '#4fc3f7';
        this.showAllConnections = true;
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
        this.gravity = 0.0;
        this.airResistance = 0.98;
        this.wallRestitution = 0.7;
        this.wallFriction = 0.95;
        // Time tracking
        this.clock = new THREE.Clock();
        this.init();
        this.createControlPanel();
        this.createNodes();
        this.setupEventListeners();
        this.animate();
    }
    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.backgroundColor);
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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
    createBoxEnvironment() {
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
        this.createGridPlane(boxWidth, boxDepth, -boxHeight / 2, 'floor', gridMaterial, wallMaterial);
        // Ceiling grid
        this.createGridPlane(boxWidth, boxDepth, boxHeight / 2, 'ceiling', gridMaterial, wallMaterial);
        // Left wall grid
        this.createGridPlane(boxDepth, boxHeight, -boxWidth / 2, 'left', gridMaterial, wallMaterial);
        // Right wall grid
        this.createGridPlane(boxDepth, boxHeight, boxWidth / 2, 'right', gridMaterial, wallMaterial);
        // Back wall grid
        this.createGridPlane(boxWidth, boxHeight, -boxDepth / 2, 'back', gridMaterial, wallMaterial);
    }
    createGridPlane(width, height, position, type, gridMaterial, wallMaterial) {
        const gridSize = 2; // Grid cell size
        const gridGroup = new THREE.Group();
        // Create solid plane background
        let planeGeometry;
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMaterial);
        // Position and rotate plane based on type
        switch (type) {
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
        const gridLines = [];
        // Vertical lines
        for (let i = -width / 2; i <= width / 2; i += gridSize) {
            gridLines.push(new THREE.Vector3(i, -height / 2, 0));
            gridLines.push(new THREE.Vector3(i, height / 2, 0));
        }
        // Horizontal lines
        for (let i = -height / 2; i <= height / 2; i += gridSize) {
            gridLines.push(new THREE.Vector3(-width / 2, i, 0));
            gridLines.push(new THREE.Vector3(width / 2, i, 0));
        }
        // Create line segments
        for (let i = 0; i < gridLines.length; i += 2) {
            const geometry = new THREE.BufferGeometry().setFromPoints([gridLines[i], gridLines[i + 1]]);
            const line = new THREE.Line(geometry, gridMaterial);
            // Apply same transformations as the plane
            switch (type) {
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
    createControlPanel() {
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
        const controls = {};
        // Helper function to create compact slider controls
        const createSlider = (label, min, max, step, value, callback) => {
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
        const createColorPicker = (label, value, callback) => {
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
            }
            else {
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
        this.controlPanel = { element: panel, controls };
    }
    createNodes() {
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
            const position = positions[i] || new THREE.Vector3((Math.random() - 0.5) * width, (Math.random() - 0.5) * height, (Math.random() - 0.5) * depth * 0.8);
            mesh.position.copy(position);
            const nodeData = {
                mesh,
                position: position.clone(),
                velocity: new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2),
                targetPosition: position.clone(),
                connections: [],
                activity: Math.random(),
                baseColor: baseColor.clone(),
                mass: 1.0 + Math.random() * 0.5, // Random mass between 1.0 and 1.5
                restitution: 0.6 + Math.random() * 0.3, // Random bounciness between 0.6 and 0.9
                friction: 0.9 + Math.random() * 0.1, // Random friction between 0.9 and 1.0
                angularVelocity: new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02),
                lastCollisionTime: 0
            };
            this.nodes.push(nodeData);
            this.scene.add(mesh);
        }
        this.updateConnections();
    }
    generatePoissonDiskSampling(numPoints, width, height, depth) {
        const points = [];
        const minDistance = Math.min(width, height, depth) / Math.sqrt(numPoints) * 0.8;
        const maxAttempts = 30;
        // Start with a random point
        if (numPoints > 0) {
            points.push(new THREE.Vector3((Math.random() - 0.5) * width, (Math.random() - 0.5) * height, (Math.random() - 0.5) * depth));
        }
        // Generate remaining points
        while (points.length < numPoints) {
            let placed = false;
            for (let attempt = 0; attempt < maxAttempts && !placed; attempt++) {
                const candidate = new THREE.Vector3((Math.random() - 0.5) * width, (Math.random() - 0.5) * height, (Math.random() - 0.5) * depth);
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
                    const candidate = new THREE.Vector3((Math.random() - 0.5) * width, (Math.random() - 0.5) * height, (Math.random() - 0.5) * depth);
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
                points.push(new THREE.Vector3((Math.random() - 0.5) * width, (Math.random() - 0.5) * height, (Math.random() - 0.5) * depth));
            }
        }
        return points;
    }
    updateConnections() {
        // Clear existing connections
        this.connectionLines.clear();
        this.nodes.forEach(node => node.connections = []);
        if (!this.showAllConnections)
            return;
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
    updateNodeColors() {
        const newColor = new THREE.Color(this.nodeColor);
        this.nodes.forEach(node => {
            node.baseColor = newColor.clone();
            node.mesh.material.color.copy(newColor);
        });
    }
    updateConnectionColors() {
        const newColor = new THREE.Color(this.connectionColor);
        this.connectionLines.children.forEach(child => {
            const line = child;
            line.material.color.copy(newColor);
        });
    }
    createRipple(position, normal, wallType) {
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
        }
        else if (wallType === 'left' || wallType === 'right') {
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
    createParticle(startNode, endNode) {
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
    updateParticles() {
        const deltaTime = 1 / 60; // Fixed 60 FPS delta time for consistent behavior
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.age += deltaTime;
            particle.progress += particle.speed * deltaTime;
            // Remove particles that have completed their journey or exceeded lifespan
            if (particle.progress >= 1.0 || particle.age >= particle.lifespan) {
                this.particleGroup.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
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
            particle.mesh.material.opacity = opacity;
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
    updateRipples() {
        const deltaTime = 1 / 60; // Fixed 60 FPS delta time for consistent behavior
        // Update existing ripples
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            ripple.age += deltaTime;
            // Remove ripples that have exceeded their lifespan
            if (ripple.age >= ripple.maxAge) {
                this.rippleGroup.remove(ripple.mesh);
                ripple.mesh.geometry.dispose();
                ripple.mesh.material.dispose();
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
            const material = ripple.mesh.material;
            material.uniforms.opacity.value = opacity;
            material.uniforms.radius.value = currentScale;
        }
    }
    updateParticleCount() {
        // This method is called when particle count changes
        // The actual particle spawning is handled in updateParticles()
    }
    updateParticleSize() {
        // Update size of existing particles
        this.particles.forEach(particle => {
            particle.mesh.scale.setScalar(this.particleSize / 0.2); // 0.2 is the base size
        });
    }
    updateParticleColors() {
        const newColor = new THREE.Color(this.particleColor);
        this.particles.forEach(particle => {
            particle.mesh.material.color.copy(newColor);
        });
    }
    updateParticleVisibility() {
        this.particleGroup.visible = this.showParticles;
        if (!this.showParticles) {
            // Clear all particles when disabled
            this.clearAllParticles();
        }
    }
    updateRippleColors() {
        const newColor = new THREE.Color(this.rippleColor);
        this.ripples.forEach(ripple => {
            const material = ripple.mesh.material;
            material.uniforms.color.value.copy(newColor);
        });
    }
    updateRippleVisibility() {
        this.rippleGroup.visible = this.showRipples;
        if (!this.showRipples) {
            // Clear all ripples when disabled
            this.clearAllRipples();
        }
    }
    clearAllRipples() {
        this.ripples.forEach(ripple => {
            this.rippleGroup.remove(ripple.mesh);
            ripple.mesh.geometry.dispose();
            ripple.mesh.material.dispose();
        });
        this.ripples = [];
    }
    clearAllParticles() {
        this.particles.forEach(particle => {
            this.particleGroup.remove(particle.mesh);
            particle.mesh.geometry.dispose();
            particle.mesh.material.dispose();
        });
        this.particles = [];
    }
    recreateNodes() {
        // Clear existing nodes
        this.nodes.forEach(node => {
            this.scene.remove(node.mesh);
            node.mesh.geometry.dispose();
            node.mesh.material.dispose();
        });
        this.nodes = [];
        // Create new nodes
        this.createNodes();
    }
    setupEventListeners() {
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
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Recreate box environment for new screen size
        this.recreateBoxEnvironment();
    }
    recreateBoxEnvironment() {
        // Clear existing box environment
        this.boxEnvironment.clear();
        // Recreate box environment with new dimensions
        this.createBoxEnvironment();
    }
    updateNodes() {
        const time = this.clock.getElapsedTime();
        const deltaTime = 1 / 60; // Fixed 60 FPS delta time for consistent behavior
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
                    angularVelocity.add(new THREE.Vector3((Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1));
                    node.lastCollisionTime = time;
                    collisionOccurred = true;
                    if (this.showRipples) {
                        const ripplePos = new THREE.Vector3(boundaryX, position.y, position.z);
                        const normal = new THREE.Vector3(-1, 0, 0);
                        this.ripples.push(this.createRipple(ripplePos, normal, 'right'));
                    }
                }
            }
            else if (position.x < -boundaryX) {
                position.x = -boundaryX;
                if (velocity.x < 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
                    const impactSpeed = Math.abs(velocity.x);
                    velocity.x = -velocity.x * (node.restitution * this.wallRestitution);
                    velocity.y *= this.wallFriction;
                    velocity.z *= this.wallFriction;
                    angularVelocity.add(new THREE.Vector3((Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1));
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
                    angularVelocity.add(new THREE.Vector3((Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1));
                    node.lastCollisionTime = time;
                    collisionOccurred = true;
                    if (this.showRipples) {
                        const ripplePos = new THREE.Vector3(position.x, boundaryY, position.z);
                        const normal = new THREE.Vector3(0, -1, 0);
                        this.ripples.push(this.createRipple(ripplePos, normal, 'ceiling'));
                    }
                }
            }
            else if (position.y < -boundaryY) {
                position.y = -boundaryY;
                if (velocity.y < 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
                    const impactSpeed = Math.abs(velocity.y);
                    velocity.y = -velocity.y * (node.restitution * this.wallRestitution);
                    velocity.x *= this.wallFriction;
                    velocity.z *= this.wallFriction;
                    angularVelocity.add(new THREE.Vector3((Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1));
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
                    angularVelocity.add(new THREE.Vector3((Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1));
                    node.lastCollisionTime = time;
                    collisionOccurred = true;
                    // No ripple for front wall (camera side)
                }
            }
            else if (position.z < -boundaryZ) {
                position.z = -boundaryZ;
                if (velocity.z < 0 && (time - node.lastCollisionTime) > minTimeBetweenCollisions) {
                    const impactSpeed = Math.abs(velocity.z);
                    velocity.z = -velocity.z * (node.restitution * this.wallRestitution);
                    velocity.x *= this.wallFriction;
                    velocity.y *= this.wallFriction;
                    angularVelocity.add(new THREE.Vector3((Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1, (Math.random() - 0.5) * impactSpeed * 0.1));
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
            }
            else {
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
            mesh.material.color.copy(color);
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
    updateConnectionGeometry() {
        let connectionIndex = 0;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                if (connectionIndex < this.connectionLines.children.length) {
                    const line = this.connectionLines.children[connectionIndex];
                    const geometry = line.geometry;
                    const positions = new Float32Array([
                        this.nodes[i].position.x, this.nodes[i].position.y, this.nodes[i].position.z,
                        this.nodes[j].position.x, this.nodes[j].position.y, this.nodes[j].position.z
                    ]);
                    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                    // Update line opacity based on node activity
                    const avgActivity = (this.nodes[i].activity + this.nodes[j].activity) * 0.5;
                    const material = line.material;
                    material.opacity = this.connectionOpacity * (0.3 + avgActivity * 0.7);
                }
                connectionIndex++;
            }
        }
    }
    animate() {
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
//# sourceMappingURL=index.js.map