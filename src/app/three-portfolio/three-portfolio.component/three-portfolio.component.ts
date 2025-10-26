import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
// Assuming ResumeService exists and provides data
import { ResumeService } from '../../services/resume.service'; 

@Component({
  selector: 'app-three-portfolio',
  standalone: true,
  imports: [],
  templateUrl: './three-portfolio.component.html',
  styleUrls: ['./three-portfolio.component.scss']
})
export class ThreePortfolioComponent implements OnInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLDivElement>;

  resumeData: any;
  selectedCard: any = null;

  private renderer?: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animationId?: number;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Interaction Properties
  private initialRotationY = 0; 
  private isDragging = false;
  private dragThreshold = 5; 
  private lastMouseX = 0;

  // Intro Text Mesh Property
  private introTextMesh?: THREE.Mesh;
  
  // New State for Zooming and Camera Control
  private targetPosition = new THREE.Vector3(0, 1.0, 7); // Default camera position
  private targetRotationY = 0;
  private isZoomed = false;


  constructor(private resumeService: ResumeService, private ngZone: NgZone) {}

  ngOnInit(): void {
    // 1. Fetch Resume Data (Simulated)
    this.resumeService.getResume().subscribe(data => {
      this.resumeData = data;
      
      // Default data if the service is empty
      if (!this.resumeData.name) this.resumeData.name = "Ananya Bara";
      if (!this.resumeData.title) this.resumeData.title = ".NET Full Stack Developer";

      // 2. Initialize 3D Scene
      this.initThree();
      
      // 3. Create 3D Objects
      this.createCards();
      
      // 4. Setup Drag Control
      this.setupInteractionHandlers(); 
      
      // 5. Start Animation Loop outside Angular zone
      this.ngZone.runOutsideAngular(() => this.animate());
    });
  }

  // -------------------------------------------------------------------
  // --- Three.js Initialization and Setup ---
  // -------------------------------------------------------------------

  private initThree() {
    const container = this.canvasContainer.nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // SCENE: Dark background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827); 

    // CAMERA
    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.copy(this.targetPosition); // Initialize camera position

    // RENDERER
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); 
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);
    
    // LIGHTING
    const ambient = new THREE.AmbientLight(0xeeeeff, 0.5);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 5, 5);
    this.scene.add(dir);
    const pointLight = new THREE.PointLight(0x3b82f6, 1.5, 50); 
    pointLight.position.set(-5, 3, 0);
    this.scene.add(pointLight);

    // Create the central identity text
    this.createIntroText(); 
    
    // NEW: Central Ground/Desk (Stylized Monitor Base)
    const deskGeometry = new THREE.BoxGeometry(10, 0.1, 4);
    const deskMaterial = new THREE.MeshLambertMaterial({ color: 0x374151 });
    const deskMesh = new THREE.Mesh(deskGeometry, deskMaterial);
    deskMesh.position.set(0, -0.5, 0);
    this.scene.add(deskMesh);
  }

  // --- Create Prominent Central Text (Ananya Bara) ---
  private createIntroText() {
    if (!this.resumeData) return;
    
    const name = this.resumeData.name;
    const title = this.resumeData.title;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'transparent'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Name
    ctx.fillStyle = '#f9fafb';
    ctx.font = 'bold 90px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, canvas.width / 2, 100);

    // Title
    ctx.fillStyle = '#3b82f6'; 
    ctx.font = '50px Inter, sans-serif';
    ctx.fillText(title, canvas.width / 2, 170);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true, // Crucial for opacity to work
        alphaTest: 0.1,
        side: THREE.DoubleSide 
    });
    
    const planeGeo = new THREE.PlaneGeometry(8, 2); 
    this.introTextMesh = new THREE.Mesh(planeGeo, material);
    
    this.introTextMesh.position.set(0, 3.5, 0); 
    this.introTextMesh.rotation.x = -0.1; 
    
    // FIX: Apply type assertion to the material when setting initial opacity (Line 139)
    (this.introTextMesh.material as THREE.MeshBasicMaterial).opacity = 0; // Start hidden

    this.scene.add(this.introTextMesh);
  }


  // --- Create Portfolio Cards ---
  private createCards() {
    if (!this.resumeData) return;

    const items = [
      { title: 'SUMMARY', content: this.resumeData.summary || 'N/A' },
      { title: 'SKILLS', content: (this.resumeData.skills || []).join(', ') },
      { title: 'EXPERIENCE', content: (this.resumeData.experience || []).map((e:any)=>e.role+' @ '+e.company).join(' | ') },
      { title: 'EDUCATION', content: (this.resumeData.education || []).map((e:any)=>e.degree+' ('+e.year+')').join(' | ') },
      { title: 'CONTACT', content: `${this.resumeData.contact?.email || ''} • ${this.resumeData.contact?.phone || ''}` }
    ];

    const group = new THREE.Group();
    const radius = 5.5; 
    const numItems = items.length;

    items.forEach((it, i) => {
      const planeGeo = new THREE.PlaneGeometry(2.4, 1.4); 
      
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      
      ctx.fillStyle = '#2d3748'; 
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#3b82f6'; 
      ctx.fillRect(0,0,canvas.width,25); 

      ctx.fillStyle = '#f9fafb'; 
      ctx.font = 'bold 64px Inter, sans-serif';
      ctx.fillText(it.title, 40, 120);
      
      ctx.font = '32px Inter, sans-serif';
      ctx.fillStyle = '#9ca3af'; 
      const lines = this.wrapText(ctx, it.content, canvas.width - 80);
      for (let l=0; l<Math.min(4, lines.length); l++){ 
        ctx.fillText(lines[l], 40, 175 + l*45);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const mat = new THREE.MeshStandardMaterial({ 
          map: texture, 
          side: THREE.FrontSide,
          metalness: 0.1, 
          roughness: 0.5 
      });
      const mesh = new THREE.Mesh(planeGeo, mat);
      
      const angle = (i / numItems) * Math.PI * 2;
      mesh.position.x = Math.sin(angle) * radius;
      mesh.position.z = Math.cos(angle) * radius;
      mesh.position.y = 1.0; 
      mesh.rotation.y = angle + Math.PI;
      mesh.rotation.x = -0.1; 

      mesh.userData = { index: i, data: it }; 
      group.add(mesh);
    });

    this.scene.add(group);
    (this.scene.userData as any).cardGroup = group;
  }

  // Helper function to wrap text on the Canvas texture
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = String(text).split(' ');
    const lines: string[] = [];
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());
    return lines;
  }
  
  // -------------------------------------------------------------------
  // --- Animation Loop and Interaction ---
  // -------------------------------------------------------------------

  // --- Animation Loop (FIXED TS2339 ERROR) ---
  private animate = () => {
    const group: THREE.Group | undefined = (this.scene.userData as any).cardGroup;
    
    // Camera Zoom/Move Interpolation for smooth transitions
    this.camera.position.lerp(this.targetPosition, 0.05);
    
    // Stop rotation when zoomed in
    if (group) {
        if (!this.isZoomed && !this.isDragging) {
            group.rotation.y += 0.001; 
        }
        
        // When zoomed, align the group's rotation to the selected card's target rotation
        if (this.isZoomed) {
             group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, this.targetRotationY, 0.05);
        }
    }
    
    // Intro Text Fade-in and Subtle Animation
    if (this.introTextMesh && !Array.isArray(this.introTextMesh.material)) {
      
      const textMaterial = this.introTextMesh.material as THREE.MeshBasicMaterial; 

      const targetOpacity = 1;
      const currentOpacity = textMaterial.opacity;
      
      // Smoothly fade in the text
      if (currentOpacity < targetOpacity) {
        textMaterial.opacity += 0.01; 
      }
      
      // Subtle vertical "breathing" animation
      const time = performance.now() * 0.0005;
      this.introTextMesh.position.y = 3.5 + Math.sin(time) * 0.05; 
    }

    this.renderer!.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.animate);
  }

  // --- View Reset Function ---
  private resetView() {
    // Reset camera target to default position
    this.targetPosition.set(0, 1.0, 7);
    this.isZoomed = false;
    this.ngZone.run(() => {
      this.selectedCard = null;
    });
  }

  // --- Drag Interaction for UX ---
  private setupInteractionHandlers() {
    const container = this.canvasContainer.nativeElement;
    
    let startClickX = 0; 
    
    container.addEventListener('mousedown', (event) => {
        if (this.isZoomed) return; // Disable drag while zoomed
        
        this.isDragging = false; 
        startClickX = event.clientX;
        this.lastMouseX = event.clientX;
        const group = (this.scene.userData as any).cardGroup as THREE.Group;
        if (group) this.initialRotationY = group.rotation.y;
    }, false);

    container.addEventListener('mousemove', (event) => {
        if (this.isZoomed) return; // Disable drag while zoomed
        
        const deltaX = event.clientX - this.lastMouseX;
        
        if (Math.abs(event.clientX - startClickX) > this.dragThreshold) {
            this.isDragging = true;
        }

        if (this.isDragging) {
            const rotationSpeed = deltaX * 0.005;
            ((this.scene.userData as any).cardGroup as THREE.Group).rotation.y += rotationSpeed;
            this.lastMouseX = event.clientX;
        }
    }, false);

    const onMouseUp = () => {
        // Handled by onCanvasClick
    };
    
    window.addEventListener('mouseup', onMouseUp, false);
  }

  // --- Event Handlers ---
  @HostListener('window:resize')
  onResize() {
    const container = this.canvasContainer.nativeElement;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(w, h);
  }

  @HostListener('document:keydown', ['$event'])
  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.isZoomed) {
      this.resetView();
    }
  }

  onCanvasClick(evt: MouseEvent) {
    
    // If zoomed, click anywhere outside the card group to reset view
    if (this.isZoomed) {
        this.resetView();
        return;
    }

    // Ignore click if it was part of a drag motion
    if (this.isDragging) { 
        this.isDragging = false; 
        return;
    } 

    const rect = this.renderer!.domElement.getBoundingClientRect();
    this.mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const group = (this.scene.userData as any).cardGroup as THREE.Group;
    const intersects = this.raycaster.intersectObjects(group.children);

    if (intersects.length) {
      const selectedMesh = intersects[0].object as THREE.Mesh;
      
      // Calculate target position for increased zooming (closer zoom: 3.5 units away from the card)
      const zoomDistance = 3.5; 
      const cardPosition = new THREE.Vector3();
      selectedMesh.getWorldPosition(cardPosition);
      
      // Calculate new camera position
      const direction = new THREE.Vector3().subVectors(this.camera.position, cardPosition).normalize();
      this.targetPosition = cardPosition.add(direction.multiplyScalar(zoomDistance));
      
      // Calculate rotation needed to face the card
      this.targetRotationY = group.rotation.y + (selectedMesh.rotation.y - group.rotation.y - Math.PI);


      this.ngZone.run(() => {
        this.selectedCard = selectedMesh.userData['data'];
        this.isZoomed = true; // Set zoom state
      });
    } else {
      this.ngZone.run(() => {
        this.selectedCard = null;
      });
    }
  }

  ngOnDestroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();
  }
}