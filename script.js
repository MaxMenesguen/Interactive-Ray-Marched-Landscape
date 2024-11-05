async function readShader(id) {
    const req = await fetch(document.getElementById(id).src);
    return await req.text();
  }
  
  function createShader(gl, type, src) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
  
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader;
  
    console.error("Could not compile WebGL Shader", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }
  
  function createProgram(gl, vertShader, fragShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
  
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) return program;
  
    console.error("Could not Link WebGL Program", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
  
  async function main() {
    const fps = document.getElementById("fps");
  
    const time = {
      current_t: Date.now(),
      dts: [1 / 60],
      t: 0,
  
      dt: () => time.dts[0],
      update: () => {
        const new_t = Date.now();
        time.dts = [(new_t - time.current_t) / 1_000, ...time.dts].slice(0, 10);
        time.t += time.dt();
        time.current_t = new_t;
  
        const dt = time.dts.reduce((a, dt) => a + dt, 0) / time.dts.length;
        fps.innerHTML = `${Math.round(1 / dt, 2)}`;
      },
    };
  
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) alert("Could not initialize WebGL Context.");
  
    const vertShader = createShader(gl, gl.VERTEX_SHADER, await readShader("vert")); // prettier-ignore
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, await readShader("frag")); // prettier-ignore
    const program = createProgram(gl, vertShader, fragShader);
  
    const a_position = gl.getAttribLocation(program, "a_position");
    const a_uv = gl.getAttribLocation(program, "a_uv");
  
    const u_resolution = gl.getUniformLocation(program, "u_resolution");
    const u_time = gl.getUniformLocation(program, "u_time");
    const u_dt = gl.getUniformLocation(program, "u_dt");
  
    // prettier-ignore
    const data = new Float32Array([
      // x    y       u    v
      -1.0, -1.0,   0.0, 0.0,
       1.0, -1.0,   1.0, 0.0,
       1.0,  1.0,   1.0, 1.0,
      -1.0,  1.0,   0.0, 1.0,
    ]);
    // prettier-ignore
    const indices = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);
  
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
  
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 4 * 4, 0);
    gl.enableVertexAttribArray(a_uv);
    gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
  
    const ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    const u_mouse = gl.getUniformLocation(program, "u_mouse");

    let mouseX = 400.0; // Initialize with 0.0 for the default value
    let mouseY = 400.0; // Initialize with 0.0 for the default value

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        // Calculate mouse coordinates relative to canvas, clamp to prevent negative values
        mouseX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        mouseY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        gl.uniform4f(u_mouse, mouseX, mouseY, 0.0, 0.0);
    });
    // Event listener for touch movement (mobile)
    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault(); // Prevent scrolling when touching the canvas
        const rect = canvas.getBoundingClientRect();
        // Using the first touch point
        const touch = event.touches[0];
        mouseX = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
        mouseY = Math.max(0, Math.min(rect.height, touch.clientY - rect.top));
        gl.uniform4f(u_mouse, mouseX, mouseY, 0.0, 0.0);
    });
  
    function loop() {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    
        gl.bindVertexArray(vao);
        gl.useProgram(program);
        gl.uniform2f(u_resolution, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(u_time, time.t);
        gl.uniform1f(u_dt, time.dt());
        gl.uniform4f(u_mouse, mouseX, mouseY, 0.0, 0.0);
        


    
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    
        time.update();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  
  main();
  