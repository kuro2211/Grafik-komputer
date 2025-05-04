window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true);

  const createScene = () => {
    const scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;
    scene.clearColor = new BABYLON.Color4(0.9, 0.9, 0.9, 1);
    scene.gravity = new BABYLON.Vector3(0, -0.5, 0);
    
    // Kamera
    const camera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 2, -10), scene);
    camera.radius = 12;
    camera.heightOffset = 4;
    camera.rotationOffset = 180;
    camera.cameraAcceleration = 0.005;
    camera.maxCameraSpeed = 0.5;
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 2;  
    camera.upperRadiusLimit = 10; 

    // Cahaya
    const hemiLight = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.4;
    hemiLight.diffuse = new BABYLON.Color3(0.8, 0.9, 1);
    hemiLight.groundColor = new BABYLON.Color3(0.4, 0.3, 0.2);

    const dirLight = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.position = new BABYLON.Vector3(0, 15, 0);
    dirLight.intensity = 1.0;
    dirLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8);

    // Bayangan
    const shadowGenerator = new BABYLON.ShadowGenerator(2048, dirLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 8;
    shadowGenerator.setDarkness(0);

    // Skybox
    var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 1000.0 }, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBoxMaterial", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.disableLighting = true; 
    skyboxMaterial.emissiveColor = new BABYLON.Color3(0.537, 0.812, 0.941); // blue
    skybox.material = skyboxMaterial;
    skybox.infiniteDistance = true;

    //  lingkungan
    BABYLON.SceneLoader.Append("assets/", "ISTANA.glb", scene, function (scene) {
      scene.meshes.forEach(mesh => {
        mesh.receiveShadows = true;
        const name = mesh.name.toLowerCase();
        if (name.includes("tanah") || name.includes("istana") || name.includes("pohon")) {
          mesh.checkCollisions = true;
          
        }
      });

      scene.meshes.forEach(mesh => {
        const name = mesh.name.toLowerCase();
        if (name.includes("pohon") || name.includes("istana")) {
          mesh.receiveShadows = true; 
          shadowGenerator.addShadowCaster(mesh);
        }
      });
      
      console.log("All meshes:", scene.meshes.map(m => m.name));
    });

    let character = null;
    let walkAnim = null;
    let walkBackAnim = null;
    let idleAnim = null;
    let animating = false;
    const inputMap = {};

    // Karakter
    BABYLON.SceneLoader.ImportMesh("", "assets/", "karakter.glb", scene, (meshes, _, __, animationGroups) => {
      character = meshes[0];
      character.position = new BABYLON.Vector3(8, 3, 30);
      character.scaling = new BABYLON.Vector3(1, 1, 1);
      character.ellipsoid = new BABYLON.Vector3(0.5, 1.2, 0.5);
      character.ellipsoidOffset = new BABYLON.Vector3(0, 1.2, 0);
      character.checkCollisions = true;
      shadowGenerator.addShadowCaster(character, true);
      camera.lockedTarget = character;

      walkAnim = animationGroups[0];
      walkBackAnim = animationGroups[1];
      idleAnim = animationGroups[2];
    });

    // Input Keyboard
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, evt => {
      inputMap[evt.sourceEvent.key.toLowerCase()] = true;
    }));
    scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, evt => {
      inputMap[evt.sourceEvent.key.toLowerCase()] = false;
      animating = false;
      walkAnim?.stop(); walkBackAnim?.stop(); sambaAnim?.stop();
    }));

    scene.onBeforeRenderObservable.add(() => {
      if (!character) return;

      const speed = 0.042;
      const rotateSpeed = 0.05;
      let keydown = false;

      const forward = character.getDirection(BABYLON.Axis.Z);
      const gravity = new BABYLON.Vector3(0, -0.2, 0);
      character.moveWithCollisions(gravity);

      if (inputMap["w"]) {
        character.moveWithCollisions(forward.scale(speed));
        keydown = true;
      }
      if (inputMap["s"]) {
        character.moveWithCollisions(forward.scale(-speed));
        keydown = true;
      }
      if (inputMap["a"]) {
        character.rotate(BABYLON.Vector3.Up(), -rotateSpeed);
        keydown = true;
      }
      if (inputMap["d"]) {
        character.rotate(BABYLON.Vector3.Up(), rotateSpeed);
        keydown = true;
      }
      if (inputMap["b"]) {
        keydown = true;
      }
      if (inputMap["space"]) {
        keydown = true;
      }
      // Raycast ke bawah untuk posisi tanah
      const rayOrigin = character.position.add(new BABYLON.Vector3(0, 3, 0));
      const rayDirection = new BABYLON.Vector3(0, -1, 0);
      const rayLength = 10;
      const ray = new BABYLON.Ray(rayOrigin, rayDirection, rayLength);
      const hit = scene.pickWithRay(ray, (mesh) => mesh.name.toLowerCase().includes("tanah"));
      if (hit.hit) {
        character.position.y = hit.pickedPoint.y + 1.2;
      }

      // Animasi
      if (keydown) {
        if (!animating) {
          animating = true;
          if (inputMap["s"]) {
            walkBackAnim?.start(true, 1.0, walkBackAnim.from, walkBackAnim.to, false);
          } else if (inputMap["b"]) {
            sambaAnim?.start(true, 1.0, sambaAnim.from, sambaAnim.to, false);
          } else {
            walkAnim?.start(true, 1.0, walkAnim.from, walkAnim.to, false);
          }
        }
      } else {
        if (animating) {
          idleAnim.start(true, 0.1 , idleAnim.from, idleAnim.to, false);
          walkBackAnim?.stop();
          animating = false;
        }
      }
    });

    return scene;
  };

  const scene = createScene();
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
});
