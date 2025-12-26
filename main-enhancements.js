// ==================== ENHANCEMENTS TO MAIN.JS ====================
// Add these features to your existing main.js file
// This file contains: Keyboard shortcuts, Undo/Redo, Layer previews, 
// Drag-drop, Transitions, Post-processing, Audio viz, Custom palettes

// ========== 1. KEYBOARD SHORTCUTS ==========
// Add this near the top of your DOMContentLoaded listener

const keyboardShortcuts = {
  init() {
    document.addEventListener('keydown', (e) => {
      // Prevent shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (!e.ctrlKey && !e.metaKey) return;
      }

      // Spacebar - Play/Pause
      if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        const audio = document.getElementById('audioPlayer');
        if (audio.paused) audio.play();
        else audio.pause();
      }

      // Number keys 1-9 - Select layers
      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const layerIndex = parseInt(e.code.replace('Digit', '')) - 1;
        if (layers[layerIndex]) {
          selectedLayer = layerIndex;
          updateLayerUI();
          updateInspector();
          updateQuickEffects();
        }
      }

      // Arrow Up/Down - Navigate layers
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        if (selectedLayer > 0) {
          selectedLayer--;
          updateLayerUI();
          updateInspector();
          updateQuickEffects();
        }
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        if (selectedLayer < layers.length - 1) {
          selectedLayer++;
          updateLayerUI();
          updateInspector();
          updateQuickEffects();
        }
      }

      // Delete - Remove selected layer
      if (e.code === 'Delete' && selectedLayer !== null) {
        e.preventDefault();
        if (layers.length > 1) {
          undoManager.record();
          layers.splice(selectedLayer, 1);
          selectedLayer = Math.min(selectedLayer, layers.length - 1);
          updateLayerUI();
          updateInspector();
          updateQuickEffects();
        }
      }

      // D - Duplicate layer
      if (e.code === 'KeyD' && selectedLayer !== null && !e.ctrlKey) {
        e.preventDefault();
        undoManager.record();
        const clone = Object.assign(Object.create(Object.getPrototypeOf(layers[selectedLayer])), layers[selectedLayer]);
        layers.push(clone);
        selectedLayer = layers.length - 1;
        updateLayerUI();
        updateInspector();
        updateQuickEffects();
      }

      // M - Toggle mute
      if (e.code === 'KeyM' && selectedLayer !== null && !e.ctrlKey) {
        e.preventDefault();
        undoManager.record();
        layers[selectedLayer].enabled = !layers[selectedLayer].enabled;
        updateLayerUI();
      }

      // R - Randomize current layer
      if (e.code === 'KeyR' && selectedLayer !== null && !e.ctrlKey) {
        e.preventDefault();
        undoManager.record();
        const layer = layers[selectedLayer];
        layer.visualMode = Math.floor(Math.random() * 15);
        layer.colorTheme = Math.floor(Math.random() * 8);
        layer.blend = ['normal', 'add', 'screen', 'multiply'][Math.floor(Math.random() * 4)];
        updateInspector();
        updateQuickEffects();
      }

      // Ctrl+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        undoManager.undo();
      }

      // Ctrl+Y - Redo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        undoManager.redo();
      }

      // Ctrl+S - Quick save
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        const name = `Quick Save ${new Date().toLocaleTimeString()}`;
        const presetData = captureCurrentPreset(name);
        presets.push(presetData);
        savePresetsToStorage();
        refreshPresetSelect();
        console.log('Preset saved:', name);
      }

      // Esc - Close help modal
      if (e.code === 'Escape') {
        document.getElementById('helpModal').style.display = 'none';
      }
    });

    // Help button
    document.getElementById('helpBtn').addEventListener('click', () => {
      document.getElementById('helpModal').style.display = 'flex';
    });

    document.getElementById('closeHelpBtn').addEventListener('click', () => {
      document.getElementById('helpModal').style.display = 'none';
    });
  }
};

// ========== 2. UNDO/REDO SYSTEM ==========
const undoManager = {
  undoStack: [],
  redoStack: [],
  maxStack: 50,

  record() {
    // Capture current state
    const state = {
      layers: layers.map(l => ({...l})),
      selectedLayer,
      brightness: parseFloat(brightnessControl.value),
      cameraZoom,
      cameraRotateDeg
    };
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxStack) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
    this.updateButtons();
  },

  undo() {
    if (this.undoStack.length === 0) return;
    
    // Save current to redo
    const currentState = {
      layers: layers.map(l => ({...l})),
      selectedLayer,
      brightness: parseFloat(brightnessControl.value),
      cameraZoom,
      cameraRotateDeg
    };
    this.redoStack.push(currentState);

    // Restore previous
    const state = this.undoStack.pop();
    this.restoreState(state);
    this.updateButtons();
  },

  redo() {
    if (this.redoStack.length === 0) return;

    // Save current to undo
    const currentState = {
      layers: layers.map(l => ({...l})),
      selectedLayer,
      brightness: parseFloat(brightnessControl.value),
      cameraZoom,
      cameraRotateDeg
    };
    this.undoStack.push(currentState);

    // Restore next
    const state = this.redoStack.pop();
    this.restoreState(state);
    this.updateButtons();
  },

  restoreState(state) {
    layers = state.layers.map(l => {
      const layer = new Layer();
      Object.assign(layer, l);
      return layer;
    });
    selectedLayer = state.selectedLayer;
    brightnessControl.value = state.brightness;
    cameraZoom = state.cameraZoom;
    cameraRotateDeg = state.cameraRotateDeg;
    cameraZoomSlider.value = cameraZoom;
    cameraRotateSlider.value = cameraRotateDeg;
    updateLayerUI();
    updateInspector();
    updateQuickEffects();
  },

  updateButtons() {
    document.getElementById('undoBtn').disabled = this.undoStack.length === 0;
    document.getElementById('redoBtn').disabled = this.redoStack.length === 0;
  },

  init() {
    document.getElementById('undoBtn').addEventListener('click', () => this.undo());
    document.getElementById('redoBtn').addEventListener('click', () => this.redo());
    this.updateButtons();
  }
};

// ========== 3. DRAG AND DROP LAYERS ==========
const dragDropLayers = {
  draggedIndex: null,

  init() {
    this.updateLayerDragHandlers();
  },

  updateLayerDragHandlers() {
    document.querySelectorAll('.layer').forEach((layerEl, index) => {
      layerEl.draggable = true;
      
      layerEl.addEventListener('dragstart', (e) => {
        this.draggedIndex = index;
        layerEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      layerEl.addEventListener('dragend', (e) => {
        layerEl.classList.remove('dragging');
        document.querySelectorAll('.layer').forEach(el => el.classList.remove('drag-over'));
      });

      layerEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        layerEl.classList.add('drag-over');
      });

      layerEl.addEventListener('dragleave', (e) => {
        layerEl.classList.remove('drag-over');
      });

      layerEl.addEventListener('drop', (e) => {
        e.preventDefault();
        layerEl.classList.remove('drag-over');
        
        if (this.draggedIndex !== null && this.draggedIndex !== index) {
          undoManager.record();
          
          // Reorder layers
          const [removed] = layers.splice(this.draggedIndex, 1);
          layers.splice(index, 0, removed);
          
          // Update selected layer index
          if (selectedLayer === this.draggedIndex) {
            selectedLayer = index;
          } else if (this.draggedIndex < selectedLayer && index >= selectedLayer) {
            selectedLayer--;
          } else if (this.draggedIndex > selectedLayer && index <= selectedLayer) {
            selectedLayer++;
          }
          
          updateLayerUI();
          this.draggedIndex = null;
        }
      });
    });
  }
};

// ========== 4. LAYER PREVIEWS/THUMBNAILS ==========
const layerPreviews = {
  previewCanvases: new Map(),

  createPreview(layerIndex) {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 40;
    return canvas;
  },

  updatePreview(layerIndex, layer) {
    if (!this.previewCanvases.has(layerIndex)) {
      const canvas = this.createPreview(layerIndex);
      this.previewCanvases.set(layerIndex, canvas);
    }
    
    const canvas = this.previewCanvases.get(layerIndex);
    const ctx = canvas.getContext('2d');
    
    // Simple preview rendering - just show color theme gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    
    // Use layer's color theme to show preview
    const themeColors = [
      ['#4fc3f7', '#1565c0'],
      ['#ffb74d', '#e64a19'],
      ['#ff4081', '#7c4dff'],
      ['#00e676', '#00acc1'],
      ['#ff8a65', '#ab47bc'],
      ['#c6ff00', '#2e7d32'],
      ['#40c4ff', '#1a237e'],
      ['#ff80ab', '#4dd0e1']
    ];
    
    const colors = themeColors[layer.colorTheme % 8];
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add visual mode indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, canvas.height - 15, canvas.width, 15);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText(`Mode: ${layer.visualMode} | ${layer.blend}`, 5, canvas.height - 4);
    
    return canvas;
  },

  addToLayerCard(layerEl, layerIndex, layer) {
    const existing = layerEl.querySelector('.layer-preview');
    if (existing) existing.remove();
    
    const previewContainer = document.createElement('div');
    previewContainer.className = 'layer-preview';
    const canvas = this.updatePreview(layerIndex, layer);
    previewContainer.appendChild(canvas);
    layerEl.appendChild(previewContainer);
  }
};

// ========== 5. POST-PROCESSING EFFECTS ==========
const postProcessing = {
  bloomIntensity: 0,
  chromaticAberration: 0,
  filmGrain: 0,
  vignette: 0,
  
  tempCanvas: null,
  tempCtx: null,

  init() {
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d');

    document.getElementById('bloomIntensity').addEventListener('input', (e) => {
      this.bloomIntensity = parseFloat(e.target.value);
    });

    document.getElementById('chromaticAberration').addEventListener('input', (e) => {
      this.chromaticAberration = parseFloat(e.target.value);
    });

    document.getElementById('filmGrain').addEventListener('input', (e) => {
      this.filmGrain = parseFloat(e.target.value);
    });

    document.getElementById('vignette').addEventListener('input', (e) => {
      this.vignette = parseFloat(e.target.value);
    });
  },

  // Apply effects to main canvas using WebGL (simplified version)
  // This would be called after rendering in the render loop
  apply(gl, canvas) {
    // Note: Full implementation would require additional shaders
    // For now, this is a placeholder showing the structure
    // In practice, you'd apply these as post-processing shader passes
  }
};

// ========== 6. AUDIO VISUALIZATION OVERLAY ==========
const audioVisualization = {
  canvas: null,
  ctx: null,
  mode: 'none',
  opacity: 0.5,

  init() {
    this.canvas = document.getElementById('audioVizOverlay');
    this.ctx = this.canvas.getContext('2d');

    document.getElementById('audioVizMode').addEventListener('change', (e) => {
      this.mode = e.target.value;
    });

    document.getElementById('audioVizOpacity').addEventListener('input', (e) => {
      this.opacity = parseFloat(e.target.value);
    });
  },

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  },

  render(bass, mid, high, frequencyData, waveformData) {
    if (this.mode === 'none') {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = this.opacity;

    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.mode === 'waveform') {
      this.ctx.strokeStyle = `rgba(244, 196, 92, ${this.opacity})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      
      const sliceWidth = w / waveformData.length;
      let x = 0;

      for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] / 128.0;
        const y = (v * h) / 2;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      this.ctx.stroke();
    }

    if (this.mode === 'spectrum') {
      const barWidth = w / frequencyData.length;
      
      for (let i = 0; i < frequencyData.length; i++) {
        const barHeight = (frequencyData[i] / 255) * h;
        const hue = (i / frequencyData.length) * 360;
        this.ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${this.opacity})`;
        this.ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
      }
    }

    if (this.mode === 'circular') {
      const centerX = w / 2;
      const centerY = h / 2;
      const radius = Math.min(w, h) / 3;

      for (let i = 0; i < frequencyData.length; i++) {
        const angle = (i / frequencyData.length) * Math.PI * 2;
        const barHeight = (frequencyData[i] / 255) * radius;
        
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        const hue = (i / frequencyData.length) * 360;
        this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${this.opacity})`;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
    }

    this.ctx.globalAlpha = 1.0;
  }
};

// ========== 7. CUSTOM COLOR PALETTE ==========
const customPalette = {
  colors: {
    A: [0.55, 0.53, 0.80],
    B: [0.53, 0.80, 0.33],
    C: [0.80, 0.33, 0.53],
    D: [0.80, 0.67, 0.20]
  },
  
  customActive: false,

  init() {
    document.getElementById('applyCustomPalette').addEventListener('click', () => {
      const colorA = this.hexToRgbNormalized(document.getElementById('paletteA').value);
      const colorB = this.hexToRgbNormalized(document.getElementById('paletteB').value);
      const colorC = this.hexToRgbNormalized(document.getElementById('paletteC').value);
      const colorD = this.hexToRgbNormalized(document.getElementById('paletteD').value);

      this.colors.A = colorA;
      this.colors.B = colorB;
      this.colors.C = colorC;
      this.colors.D = colorD;
      
      this.customActive = true;
      console.log('Custom palette applied!', this.colors);
    });
  },

  hexToRgbNormalized(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ] : [0.5, 0.5, 0.5];
  },

  getPaletteColors() {
    return this.customActive ? this.colors : null;
  }
};

// ========== INITIALIZATION ==========
// Call these in your DOMContentLoaded:
// keyboardShortcuts.init();
// undoManager.init();
// dragDropLayers.init();
// postProcessing.init();
// audioVisualization.init();
// customPalette.init();
