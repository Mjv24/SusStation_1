/* ================= CINEMATIC POST-PROCESSING (WebGL): bloom, colour grade, lens, grain ================= */
const PostFX={ on:false, gl:null, kickV:0, alarm:0,
  init(){
    const want=localStorage.getItem('sus_fx'); this.enabled=want==null?false:want==='1';
    const c=document.getElementById('gl'); this.cv=c;
    try{ this.gl=c.getContext('webgl',{alpha:false,antialias:false,depth:false,premultipliedAlpha:false,preserveDrawingBuffer:false}); }catch(e){}
    const gl=this.gl; if(!gl){ this.enabled=false; this.apply(); return; }
    const vs=`attribute vec2 p; varying vec2 v; void main(){ v=p*0.5+0.5; gl_Position=vec4(p,0.,1.); }`;
    const fs=`precision mediump float; varying vec2 v; uniform sampler2D T,B; uniform float tm,ca,al,bl; uniform vec2 rs;
      float hs(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
      void main(){ vec2 d=v-0.5; float r2=dot(d,d); vec2 o=d*ca*(0.35+r2*2.2);
        vec3 c=vec3(texture2D(T,v+o).r,texture2D(T,v).g,texture2D(T,v-o).b);
        vec3 b=texture2D(B,v).rgb; vec3 br=max(b-0.6,0.0);
        c+=br*bl*1.5+b*0.035*bl;
        float l=dot(c,vec3(.299,.587,.114));
        c=mix(vec3(l),c,1.16); c=(c-0.5)*1.08+0.5;
        c*=mix(vec3(0.92,0.98,1.1),vec3(1.07,1.0,0.93),smoothstep(0.15,0.85,l));
        c=mix(c,c*vec3(1.35,0.5,0.5),al);
        c*=1.0-r2*0.62;
        gl_FragColor=vec4(c,1.0); }`;
    const sh=(t,src)=>{ const s=gl.createShader(t); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; };
    try{ const pr=gl.createProgram(); gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs)); gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(pr); gl.useProgram(pr); this.pr=pr; }
    catch(e){ console.warn('postfx',e); this.gl=null; this.enabled=false; this.apply(); return; }
    const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(this.pr,'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const mk=u=>{ const t=gl.createTexture(); gl.activeTexture(gl.TEXTURE0+u); gl.bindTexture(gl.TEXTURE_2D,t); [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE)); [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(k=>gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR)); return t; };
    this.tMain=mk(0); this.tBloom=mk(1); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    const U=n=>gl.getUniformLocation(this.pr,n); this.u={T:U('T'),B:U('B'),tm:U('tm'),ca:U('ca'),al:U('al'),bl:U('bl'),rs:U('rs')};
    gl.uniform1i(this.u.T,0); gl.uniform1i(this.u.B,1);
    this.b1=document.createElement('canvas'); this.b2=document.createElement('canvas');
    c.addEventListener('webglcontextlost',e=>{ e.preventDefault(); this.on=false; c.style.display='none'; });
    this.apply();
  },
  set(v){ this.enabled=v; localStorage.setItem('sus_fx',v?'1':'0'); this.apply(); },
  apply(){ this.on=!!(this.enabled&&this.gl); if(this.cv) this.cv.style.display=this.on?'block':'none'; },
  kick(v){ this.kickV=Math.max(this.kickV,v); },
  draw(src,dt){
    if(!this.on) return; const gl=this.gl, W=src.width, H=src.height;
    if(this.cv.width!==W||this.cv.height!==H){ this.cv.width=W; this.cv.height=H; gl.viewport(0,0,W,H);
 }
    // bloom source: two-step downscale = cheap wide blur
    // halve step by step so every pixel is averaged (single big downscales skip pixels and make bloom sparkle)
    let cur=src, w=W, hh=H; this.pyr=this.pyr||[]; for(let i=0;i<4;i++){ w=Math.max(2,w>>1); hh=Math.max(2,hh>>1); const c=this.pyr[i]||(this.pyr[i]=document.createElement('canvas')); if(c.width!==w||c.height!==hh){c.width=w;c.height=hh;} const x=c.getContext('2d'); x.imageSmoothingEnabled=true; x.drawImage(cur,0,0,w,hh); cur=c; } this.b2=cur;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.tMain); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,src);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,this.tBloom); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,this.b2);
    this.kickV=Math.max(0,this.kickV-dt*1.6);
    const t=performance.now()/1000; const crit=G.screen==='game'&&G.phase==='play'&&G.sab&&G.sab.crit;
    this.alarm+=((crit?0.065:0)-this.alarm)*Math.min(1,dt*6);
    gl.uniform1f(this.u.tm,t*0.37); gl.uniform1f(this.u.ca,0); gl.uniform1f(this.u.al,Math.max(0,this.alarm)+this.kickV*0.25); gl.uniform1f(this.u.bl,G.screen==='game'?0.28:0.4); gl.uniform2f(this.u.rs,W,H);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
};
