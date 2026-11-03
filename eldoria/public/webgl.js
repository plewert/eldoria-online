/* Post-proceso WebGL opcional para los poderes realistas: bloom, aberración cromática y distorsión por calor/onda.
   Sin dependencias. Solo se dibuja mientras hay efectos activos; si WebGL no existe, no hace nada. Quitar: borrar este archivo y su <script>. */
(() => {
  const view = document.getElementById('view'); if (!view) return;
  const gl0 = document.createElement('canvas'); let gl = null;
  try { gl = gl0.getContext('webgl', { premultipliedAlpha: false, alpha: false }); } catch (e) { gl = null; }
  if (!gl) return;
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec3 pts[6];uniform float ab,bl,tm,asp;
  void main(){
    vec2 uv=v, off=vec2(0.);
    for(int i=0;i<6;i++){ if(pts[i].z>0.){ vec2 d=(uv-pts[i].xy)*vec2(asp,1.); float r=length(d); float w=exp(-r*5.)*pts[i].z;
      off+=normalize(d+1e-4)*sin(r*70.-tm*14.)*w*0.0045/vec2(asp,1.); off.y+=sin(uv.x*90.+tm*9.)*w*0.0025; } }
    uv+=off;
    vec2 c=(uv-.5); float k=ab*0.006;
    vec3 col=vec3(texture2D(t,uv+c*k).r,texture2D(t,uv).g,texture2D(t,uv-c*k).b);
    if(bl>0.){ vec3 s=vec3(0.); for(int i=0;i<8;i++){ float a=float(i)*0.785; vec2 o=vec2(cos(a),sin(a)); s+=max(texture2D(t,uv+o*0.006).rgb-.55,0.)+max(texture2D(t,uv+o*0.016).rgb-.55,0.); } col+=s*bl*0.28; }
    gl_FragColor=vec4(col,1.);
  }`;
  const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS); if (!vs || !fs) return;
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, val);
  const U = (n) => gl.getUniformLocation(pr, n);
  gl0.id = 'glfx'; gl0.setAttribute('aria-hidden', 'true'); gl0.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none';
  view.insertAdjacentElement('afterend', gl0);
  const wasGL = () => window.EldGL = { on: gl0.style.display !== 'none' };
  function loop(now) {
    requestAnimationFrame(loop);
    const G = window.EldExt && window.EldExt.G, S = G && G.rfGL;
    const act = S && (S.pts.length || S.ab > 0.02 || S.bloom > 0.02);
    if (!act || !view.width) { if (gl0.style.display !== 'none') gl0.style.display = 'none'; return; }
    if (gl0.width !== view.width || gl0.height !== view.height) { gl0.width = view.width; gl0.height = view.height; }
    gl.viewport(0, 0, gl0.width, gl0.height);
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, view);
    const a = new Float32Array(18); S.pts.forEach((p, i) => { a[i * 3] = p[0]; a[i * 3 + 1] = p[1]; a[i * 3 + 2] = p[2]; });
    gl.uniform3fv(U('pts[0]'), a); gl.uniform1f(U('ab'), S.ab); gl.uniform1f(U('bl'), S.bloom); gl.uniform1f(U('tm'), now / 1000); gl.uniform1f(U('asp'), gl0.width / gl0.height); gl.uniform1i(U('t'), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (gl0.style.display === 'none') gl0.style.display = 'block'; wasGL();
  }
  requestAnimationFrame(loop);
})();
