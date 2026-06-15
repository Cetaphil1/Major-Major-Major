import{t as e}from"./rolldown-runtime.C4p97ucE.mjs";import{A as t,C as n,D as r,I as i,M as a,N as o,R as s,c,g as l,k as u,l as d,o as f,v as p}from"./react.DXZ2gJ9b.mjs";import{a as m,r as h,t as g,w as _}from"./motion.C22RgBJB.mjs";import{A as v,L as y,O as b,R as x,T as S,W as C,b as w,ft as T,k as E,l as ee,mt as D,pt as O,r as k,st as te,tt as ne,w as A,z as j}from"./framer.XP-6FWCt.mjs";import{i as M,n as N,r as P,t as re}from"./Cr7zSIz6f.Cy8_x1kl.mjs";var F,ie=e((()=>{C(),F=E({title:`Liquid Gradient`,resolutionScale:`consistent`,fragment:`
// === CONSTANTS ===
const float GOLDEN_ANGLE = 2.3999632;
const float TAU = 6.28318530;

// === PCG hash - https://www.jcgt.org/published/0009/03/02/
uvec3 hash3(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

// Seed
vec3 seedRandom(float seedVal) {
    uvec3 s = uvec3(
        floatBitsToUint(seedVal),
        floatBitsToUint(seedVal * 1.5 + 7.31),
        floatBitsToUint(seedVal * 2.7 + 13.37)
    );
    s = hash3(s);
    return vec3(s) / float(0xFFFFFFFFu);
}

// === COLOR SPACE UTILITIES ===
vec3 toLinear(vec3 c) {
    return pow(c, vec3(2.2));
}

vec3 toSrgb(vec3 c) {
    return pow(clamp(c, 0.0, 1.0), vec3(0.4545));
}

vec3 linearToOklab(vec3 c) {
    float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
    float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
    float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
    
    l = pow(max(l, 0.0), 1.0/3.0);
    m = pow(max(m, 0.0), 1.0/3.0);
    s = pow(max(s, 0.0), 1.0/3.0);
    
    return vec3(
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    );
}

vec3 oklabToLinear(vec3 c) {
    float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
    float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
    float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
    
    l = l * l * l;
    m = m * m * m;
    s = s * s * s;
    
    return vec3(
        +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    );
}

vec3 oklabToLch(vec3 lab) {
    return vec3(lab.x, length(lab.yz), atan(lab.z, lab.y));
}

vec3 lchToOklab(vec3 lch) {
    return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
}

vec3 mixLch(vec3 lab0, vec3 lab1, float t) {
    vec3 lch0 = oklabToLch(lab0);
    vec3 lch1 = oklabToLch(lab1);
    
    if (lch0.y < 0.05) lch0.z = lch1.z;
    if (lch1.y < 0.05) lch1.z = lch0.z;
    
    float dh = lch1.z - lch0.z;
    if (dh > 3.14159265) dh -= 6.28318530;
    if (dh < -3.14159265) dh += 6.28318530;
    
    return lchToOklab(vec3(
        mix(lch0.x, lch1.x, t),
        mix(lch0.y, lch1.y, t),
        lch0.z + dh * t
    ));
}

// === PALETTE SAMPLING ===
vec3 getColor(int idx) {
    if (u_colors_length < 1) return vec3(0.0);
    int safeIdx = clamp(idx, 0, u_colors_length - 1);
    return u_colors[safeIdx].rgb;
}

vec3 paletteN(float t, int count) {
    if (count < 1) return vec3(0.0);
    if (count < 2) return toLinear(getColor(0));
    
    float segmentSize = 1.0 / float(count - 1);
    t = clamp(t, 0.0, 1.0);
    int idx = min(int(floor(t / segmentSize)), count - 2);
    float localT = clamp((t - float(idx) * segmentSize) / segmentSize, 0.0, 1.0);
    
    vec3 lab0 = linearToOklab(toLinear(getColor(idx)));
    vec3 lab1 = linearToOklab(toLinear(getColor(idx + 1)));
    
    return oklabToLinear(mixLch(lab0, lab1, localT));
}

// === DITHER ===
float IGN(vec2 uv) {
    return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))));
}

float quickNoise(vec2 I) {
    return fract(sin(dot(I, vec2(12.9898, 78.233))) * 43758.5453);
}

// Dither Mode: 0=Off, 1=IGN, 2=quickNoise
float getDither(vec2 I, float mode) {
    if (mode < 0.5) return 0.5;          // 0: Off
    if (mode < 1.5) return IGN(I);       // 1: Smooth
    return quickNoise(I);                // 2: Grain
}

// === POST-PROCESS ===
vec3 softGamutMap(vec3 linearRgb) {
    float maxC = max(linearRgb.r, max(linearRgb.g, linearRgb.b));
    float minC = min(linearRgb.r, min(linearRgb.g, linearRgb.b));
    
    if (minC >= 0.0 && maxC <= 1.0) return linearRgb;
    
    vec3 lab = linearToOklab(max(linearRgb, 0.0));
    float L = clamp(lab.x, 0.0, 1.0);
    float C = length(lab.yz);
    float h = atan(lab.z, lab.y);
    
    float maxChroma = 0.4 * (1.0 - pow(abs(2.0 * L - 1.0), 2.0));
    
    if (C > maxChroma * 0.7) {
        float knee = maxChroma * 0.7;
        C = knee + (maxChroma - knee) * tanh((C - knee) / (maxChroma - knee + 0.001));
    }
    
    return clamp(oklabToLinear(vec3(L, C * cos(h), C * sin(h))), 0.0, 1.0);
}

vec3 applyContrastSaturation(vec3 linearRgb, float contrast, float saturation) {
    vec3 lab = linearToOklab(linearRgb);
    float C = length(lab.yz);
    float h = atan(lab.z, lab.y);
    
    lab.x = clamp((lab.x - 0.5) * contrast + 0.5, 0.0, 1.0);
    C *= saturation;
    lab.y = C * cos(h);
    lab.z = C * sin(h);
    
    return oklabToLinear(lab);
}

// === MAIN ===
void main() {
    vec2 fragCoord = v_uv * u_resolution;
    vec2 r = u_resolution;
    vec2 p = (fragCoord * 2.0 - r) / r.y;
    
    int colorCount = u_colors_length;
    
    // Early out: no colors -> black
    if (colorCount < 1) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    float t = u_time * 0.3;
    
    // Map time onto a circle so animation seamlessly wraps.
    float looping = step(0.5, u_loop);
    float phase = TAU * u_time / max(u_loop, 0.01);
    float radius = u_loop * u_speed * 0.3 / TAU;
    float tA = sin(phase) * radius;
    float tB = (1.0 - cos(phase)) * radius;
    
    // Seed-based offsets
    vec3 seedOffset = seedRandom(u_seed);
    vec3 seedOffset2 = seedRandom(u_seed + 100.0);
    
    // Golden angle rotation
    float seedAngle = u_seed * GOLDEN_ANGLE;
    vec2 seedPhase = (seedOffset2.xy - 0.5) * TAU;
    
    // Seed-based rotation
    float cs = cos(seedAngle);
    float sn = sin(seedAngle);
    p = mat2(cs, -sn, sn, cs) * p;
    
    // Get dither value
    float dither = getDither(floor(fragCoord / u_pixelRatio), u_ditherMode);
    
    // === TURBULENCE ===
    float totalVal = 0.0;
    float totalWeight = 0.0;
    int turbIter = int(u_turbIter);
    
    float freq = 1.0 / max(u_turbFreq, 0.01);
    
    for (float i = 0.0; i < 4.0; i++) {
        float eph = i / 4.0;
       
        vec2 q = p * u_scale;
        float sq = eph * eph;
        
        if (u_jellify > 0.5) {
            q.yx *= mix(1.0, 0.5, 1.0 - exp(-sq));
        }
        
        float a = seedPhase.x;
        float d = seedPhase.y;
        
        for (int j = 2; j < 13; j++) {
            if (j >= turbIter) break;
            float fj = float(j);
            // When looping, use circular time. Otherwise original t.
            float t1 = mix(t * u_speed, tA, looping);
            float t2 = mix(t * u_speed, tB, looping);
            q += u_turbAmp * sin(q.yx / freq * fj + t1 + vec2(a, d) + seedOffset.xy * fj) / fj;
            a += cos(fj + d * 1.2 + q.x * 2.0 - t1 + seedOffset2.z + t2 * 0.3 * looping);
            d += sin(fj * q.y + a + seedOffset.z + t1 + seedOffset2.y + t2 * 0.3 * looping);
        }
        
        float v = 0.5 + 0.5 * sin(length(q.yx + vec2(a, d) * 0.2) * u_waveFreq + i * i + seedOffset.x);
        float weight = smoothstep(0.0, 0.5, eph) * smoothstep(1.0, 0.5, eph);
        totalVal += v * weight;
        totalWeight += weight;
    }
    
    float val = totalVal / totalWeight;
    val = clamp((val - 0.3) / 0.4, 0.0, 1.0);
    val = pow(val, exp(-u_distBias));
    val = clamp(val + (dither - 0.5) * u_dither, 0.0, 1.0);
    
    vec3 col = paletteN(val, colorCount);
    col *= u_exposure;
    col = applyContrastSaturation(col, u_contrast, u_saturation);
    col = softGamutMap(col);
    col = toSrgb(col);
    
    fragColor = vec4(col, 1.0);
}
`,propertyControls:{colors:{type:k.Array,title:`Colors`,control:{type:k.Color},maxCount:8,defaultValue:[`#000329`,`#0080FF`,`#FF8330`]},seed:{type:k.Number,title:`Seed`,defaultValue:40,min:0,max:1e3,step:1},speed:{type:k.Number,title:`Speed`,defaultValue:.3,min:0,max:2,step:.01},loop:{type:k.Number,title:`Loop`,defaultValue:0,min:0,max:60,step:.5,hiddenWhenUnset:!0,displayStepper:!0},scale:{type:k.Number,title:`Scale`,defaultValue:1.1,min:.1,max:2,step:.01},turbAmp:{type:k.Number,title:`Amplitude`,defaultValue:.5,min:0,max:1,step:.01},turbFreq:{type:k.Number,title:`Frequency`,defaultValue:.2,min:.1,max:2,step:.01},turbIter:{type:k.Number,title:`Definition`,defaultValue:7,min:3,max:10,step:1,displayStepper:!0},waveFreq:{type:k.Number,title:`Bands`,defaultValue:2,min:.1,max:5,step:.1},distBias:{type:k.Number,title:`Bias`,defaultValue:0,min:-1,max:1,step:.1,hiddenWhenUnset:!0},jellify:{type:k.Boolean,title:`Jellify`,defaultValue:!1,hiddenWhenUnset:!0},ditherMode:{type:k.Enum,title:`Noise`,options:[0,1,2],optionTitles:[`Off`,`Smooth`,`Grain`],defaultValue:0},dither:{type:k.Number,title:`Amount`,defaultValue:.05,min:0,max:.2,step:.01,hidden:e=>e.ditherMode===0},exposure:{type:k.Number,title:`Exposure`,defaultValue:1,min:.5,max:2,step:.1,section:`Filters`,displayStepper:!0,hiddenWhenUnset:!0},contrast:{type:k.Number,title:`Contrast`,defaultValue:1.2,min:.5,max:2,step:.1,section:`Filters`,displayStepper:!0,hiddenWhenUnset:!0},saturation:{type:k.Number,title:`Saturation`,defaultValue:1,min:0,max:2,step:.1,section:`Filters`,displayStepper:!0,hiddenWhenUnset:!0}}})}));function ae(e,t,n){return Math.max(e,Math.min(t,n))}var oe,se,I,L,R,z,ce=e((()=>{i(),oe=class{advance(e){if(!this.isRunning)return;let t=!1;if(this.lerp)this.value=function(e,t,n,r){return function(e,t,n){return(1-n)*e+n*t}(e,t,1-Math.exp(-n*r))}(this.value,this.to,60*this.lerp,e),Math.round(this.value)===this.to&&(this.value=this.to,t=!0);else{this.currentTime+=e;let n=ae(0,this.currentTime/this.duration,1);t=n>=1;let r=t?1:this.easing(n);this.value=this.from+(this.to-this.from)*r}t&&this.stop(),this.onUpdate?.(this.value,t)}stop(){this.isRunning=!1}fromTo(e,t,{lerp:n=.1,duration:r=1,easing:i=(e=>e),onStart:a,onUpdate:o}){this.from=this.value=e,this.to=t,this.lerp=n,this.duration=r,this.easing=i,this.currentTime=0,this.isRunning=!0,a?.(),this.onUpdate=o}},se=class{constructor({wrapper:e,content:t,autoResize:n=!0,debounce:r=250}={}){this.wrapper=e,this.content=t,n&&(this.debouncedResize=function(e,t){let n;return function(){let r=arguments,i=this;clearTimeout(n),n=setTimeout((function(){e.apply(i,r)}),t)}}(this.resize,r),this.wrapper===s?s.addEventListener(`resize`,this.debouncedResize,!1):(this.wrapperResizeObserver=new ResizeObserver(this.debouncedResize),this.wrapperResizeObserver.observe(this.wrapper)),this.contentResizeObserver=new ResizeObserver(this.debouncedResize),this.contentResizeObserver.observe(this.content)),this.resize()}destroy(){this.wrapperResizeObserver?.disconnect(),this.contentResizeObserver?.disconnect(),s.removeEventListener(`resize`,this.debouncedResize,!1)}resize=()=>{this.onWrapperResize(),this.onContentResize()};onWrapperResize=()=>{this.wrapper===s?(this.width=s.innerWidth,this.height=s.innerHeight):(this.width=this.wrapper.clientWidth,this.height=this.wrapper.clientHeight)};onContentResize=()=>{this.wrapper===s?(this.scrollHeight=this.content.scrollHeight,this.scrollWidth=this.content.scrollWidth):(this.scrollHeight=this.wrapper.scrollHeight,this.scrollWidth=this.wrapper.scrollWidth)};get limit(){return{x:this.scrollWidth-this.width,y:this.scrollHeight-this.height}}},I=class{constructor(){this.events={}}emit(e,...t){let n=this.events[e]||[];for(let e=0,r=n.length;e<r;e++)n[e](...t)}on(e,t){return this.events[e]?.push(t)||(this.events[e]=[t]),()=>{this.events[e]=this.events[e]?.filter((e=>t!==e))}}off(e,t){this.events[e]=this.events[e]?.filter((e=>t!==e))}destroy(){this.events={}}},L=100/6,R=class{constructor(e,{wheelMultiplier:t=1,touchMultiplier:n=1}){this.element=e,this.wheelMultiplier=t,this.touchMultiplier=n,this.touchStart={x:null,y:null},this.emitter=new I,s.addEventListener(`resize`,this.onWindowResize,!1),this.onWindowResize(),this.element.addEventListener(`wheel`,this.onWheel,{passive:!1}),this.element.addEventListener(`touchstart`,this.onTouchStart,{passive:!1}),this.element.addEventListener(`touchmove`,this.onTouchMove,{passive:!1}),this.element.addEventListener(`touchend`,this.onTouchEnd,{passive:!1})}on(e,t){return this.emitter.on(e,t)}destroy(){this.emitter.destroy(),s.removeEventListener(`resize`,this.onWindowResize,!1),this.element.removeEventListener(`wheel`,this.onWheel,{passive:!1}),this.element.removeEventListener(`touchstart`,this.onTouchStart,{passive:!1}),this.element.removeEventListener(`touchmove`,this.onTouchMove,{passive:!1}),this.element.removeEventListener(`touchend`,this.onTouchEnd,{passive:!1})}onTouchStart=e=>{let{clientX:t,clientY:n}=e.targetTouches?e.targetTouches[0]:e;this.touchStart.x=t,this.touchStart.y=n,this.lastDelta={x:0,y:0},this.emitter.emit(`scroll`,{deltaX:0,deltaY:0,event:e})};onTouchMove=e=>{let{clientX:t,clientY:n}=e.targetTouches?e.targetTouches[0]:e,r=-(t-this.touchStart.x)*this.touchMultiplier,i=-(n-this.touchStart.y)*this.touchMultiplier;this.touchStart.x=t,this.touchStart.y=n,this.lastDelta={x:r,y:i},this.emitter.emit(`scroll`,{deltaX:r,deltaY:i,event:e})};onTouchEnd=e=>{this.emitter.emit(`scroll`,{deltaX:this.lastDelta.x,deltaY:this.lastDelta.y,event:e})};onWheel=e=>{let{deltaX:t,deltaY:n,deltaMode:r}=e;t*=r===1?L:r===2?this.windowWidth:1,n*=r===1?L:r===2?this.windowHeight:1,t*=this.wheelMultiplier,n*=this.wheelMultiplier,this.emitter.emit(`scroll`,{deltaX:t,deltaY:n,event:e})};onWindowResize=()=>{this.windowWidth=s.innerWidth,this.windowHeight=s.innerHeight}},z=class{constructor({wrapper:e=s,content:t=document.documentElement,wheelEventsTarget:n=e,eventsTarget:r=n,smoothWheel:i=!0,syncTouch:a=!1,syncTouchLerp:o=.075,touchInertiaMultiplier:c=35,duration:l,easing:u=(e=>Math.min(1,1.001-2**(-10*e))),lerp:d=!l&&.1,infinite:f=!1,orientation:p=`vertical`,gestureOrientation:m=`vertical`,touchMultiplier:h=1,wheelMultiplier:g=1,autoResize:_=!0,prevent:v=!1,__experimental__naiveDimensions:y=!1}={}){this.__isScrolling=!1,this.__isStopped=!1,this.__isLocked=!1,this.onVirtualScroll=({deltaX:e,deltaY:t,event:n})=>{if(n.ctrlKey)return;let r=n.type.includes(`touch`),i=n.type.includes(`wheel`);if(this.isTouching=n.type===`touchstart`||n.type===`touchmove`,this.options.syncTouch&&r&&n.type===`touchstart`&&!this.isStopped&&!this.isLocked)return void this.reset();let a=e===0&&t===0,o=this.options.gestureOrientation===`vertical`&&t===0||this.options.gestureOrientation===`horizontal`&&e===0;if(a||o)return;let s=n.composedPath();s=s.slice(0,s.indexOf(this.rootElement));let c=this.options.prevent;if(s.find((e=>(typeof c==`function`?c?.(e):c)||e.hasAttribute?.call(e,`data-lenis-prevent`)||r&&e.hasAttribute?.call(e,`data-lenis-prevent-touch`)||i&&e.hasAttribute?.call(e,`data-lenis-prevent-wheel`)||e.classList?.contains(`lenis`)&&!e.classList?.contains(`lenis-stopped`))))return;if(this.isStopped||this.isLocked)return void n.preventDefault();if(!(this.options.syncTouch&&r||this.options.smoothWheel&&i))return this.isScrolling=`native`,void this.animate.stop();n.preventDefault();let l=t;this.options.gestureOrientation===`both`?l=Math.abs(t)>Math.abs(e)?t:e:this.options.gestureOrientation===`horizontal`&&(l=e);let u=r&&this.options.syncTouch,d=r&&n.type===`touchend`&&Math.abs(l)>5;d&&(l=this.velocity*this.options.touchInertiaMultiplier),this.scrollTo(this.targetScroll+l,Object.assign({programmatic:!1},u?{lerp:d?this.options.syncTouchLerp:1}:{lerp:this.options.lerp,duration:this.options.duration,easing:this.options.easing}))},this.onNativeScroll=()=>{if(clearTimeout(this.__resetVelocityTimeout),delete this.__resetVelocityTimeout,this.__preventNextNativeScrollEvent)delete this.__preventNextNativeScrollEvent;else if(!1===this.isScrolling||this.isScrolling===`native`){let e=this.animatedScroll;this.animatedScroll=this.targetScroll=this.actualScroll,this.lastVelocity=this.velocity,this.velocity=this.animatedScroll-e,this.direction=Math.sign(this.animatedScroll-e),this.isScrolling=`native`,this.emit(),this.velocity!==0&&(this.__resetVelocityTimeout=setTimeout((()=>{this.lastVelocity=this.velocity,this.velocity=0,this.isScrolling=!1,this.emit()}),400))}},s.lenisVersion=`1.1.2`,e!==document.documentElement&&e!==document.body||(e=s),this.options={wrapper:e,content:t,wheelEventsTarget:n,eventsTarget:r,smoothWheel:i,syncTouch:a,syncTouchLerp:o,touchInertiaMultiplier:c,duration:l,easing:u,lerp:d,infinite:f,gestureOrientation:m,orientation:p,touchMultiplier:h,wheelMultiplier:g,autoResize:_,prevent:v,__experimental__naiveDimensions:y},this.animate=new oe,this.emitter=new I,this.dimensions=new se({wrapper:e,content:t,autoResize:_}),this.updateClassName(),this.userData={},this.time=0,this.velocity=this.lastVelocity=0,this.isLocked=!1,this.isStopped=!1,this.isScrolling=!1,this.targetScroll=this.animatedScroll=this.actualScroll,this.options.wrapper.addEventListener(`scroll`,this.onNativeScroll,!1),this.virtualScroll=new R(r,{touchMultiplier:h,wheelMultiplier:g}),this.virtualScroll.on(`scroll`,this.onVirtualScroll)}destroy(){this.emitter.destroy(),this.options.wrapper.removeEventListener(`scroll`,this.onNativeScroll,!1),this.virtualScroll.destroy(),this.dimensions.destroy(),this.cleanUpClassName()}on(e,t){return this.emitter.on(e,t)}off(e,t){return this.emitter.off(e,t)}setScroll(e){this.isHorizontal?this.rootElement.scrollLeft=e:this.rootElement.scrollTop=e}resize(){this.dimensions.resize()}emit({userData:e={}}={}){this.userData=e,this.emitter.emit(`scroll`,this),this.userData={}}reset(){this.isLocked=!1,this.isScrolling=!1,this.animatedScroll=this.targetScroll=this.actualScroll,this.lastVelocity=this.velocity=0,this.animate.stop()}start(){this.isStopped&&(this.isStopped=!1,this.reset())}stop(){this.isStopped||(this.isStopped=!0,this.animate.stop(),this.reset())}raf(e){let t=e-(this.time||e);this.time=e,this.animate.advance(.001*t)}scrollTo(e,{offset:t=0,immediate:n=!1,lock:r=!1,duration:i=this.options.duration,easing:a=this.options.easing,lerp:o=!i&&this.options.lerp,onStart:c,onComplete:l,force:u=!1,programmatic:d=!0,userData:f={}}={}){if(!this.isStopped&&!this.isLocked||u){if([`top`,`left`,`start`].includes(e))e=0;else if([`bottom`,`right`,`end`].includes(e))e=this.limit;else{let n;if(typeof e==`string`?n=document.querySelector(e):e!=null&&e.nodeType&&(n=e),n){if(this.options.wrapper!==s){let e=this.options.wrapper.getBoundingClientRect();t-=this.isHorizontal?e.left:e.top}let r=n.getBoundingClientRect();e=(this.isHorizontal?r.left:r.top)+this.animatedScroll}}if(typeof e==`number`){if(e+=t,e=Math.round(e),this.options.infinite?d&&(this.targetScroll=this.animatedScroll=this.scroll):e=ae(0,e,this.limit),n)return this.animatedScroll=this.targetScroll=e,this.setScroll(this.scroll),this.reset(),void(l==null||l(this));e!==this.targetScroll&&(d||(this.targetScroll=e),this.animate.fromTo(this.animatedScroll,e,{duration:i,easing:a,lerp:o,onStart:()=>{r&&(this.isLocked=!0),this.isScrolling=`smooth`,c?.(this)},onUpdate:(e,t)=>{this.isScrolling=`smooth`,this.lastVelocity=this.velocity,this.velocity=e-this.animatedScroll,this.direction=Math.sign(this.velocity),this.animatedScroll=e,this.setScroll(this.scroll),d&&(this.targetScroll=e),t||this.emit({userData:f}),t&&(this.reset(),this.emit({userData:f}),l?.(this),this.__preventNextNativeScrollEvent=!0)}}))}}}get rootElement(){return this.options.wrapper===s?document.documentElement:this.options.wrapper}get limit(){return this.options.__experimental__naiveDimensions?this.isHorizontal?this.rootElement.scrollWidth-this.rootElement.clientWidth:this.rootElement.scrollHeight-this.rootElement.clientHeight:this.dimensions.limit[this.isHorizontal?`x`:`y`]}get isHorizontal(){return this.options.orientation===`horizontal`}get actualScroll(){return this.isHorizontal?this.rootElement.scrollLeft:this.rootElement.scrollTop}get scroll(){return this.options.infinite?function(e,t){return(e%t+t)%t}(this.animatedScroll,this.limit):this.animatedScroll}get progress(){return this.limit===0?1:this.scroll/this.limit}get isScrolling(){return this.__isScrolling}set isScrolling(e){this.__isScrolling!==e&&(this.__isScrolling=e,this.updateClassName())}get isStopped(){return this.__isStopped}set isStopped(e){this.__isStopped!==e&&(this.__isStopped=e,this.updateClassName())}get isLocked(){return this.__isLocked}set isLocked(e){this.__isLocked!==e&&(this.__isLocked=e,this.updateClassName())}get isSmooth(){return this.isScrolling===`smooth`}get className(){let e=`lenis`;return this.isStopped&&(e+=` lenis-stopped`),this.isLocked&&(e+=` lenis-locked`),this.isScrolling&&(e+=` lenis-scrolling`),this.isScrolling===`smooth`&&(e+=` lenis-smooth`),e}updateClassName(){this.cleanUpClassName(),this.rootElement.className=`${this.rootElement.className} ${this.className}`.trim()}cleanUpClassName(){this.rootElement.className=this.rootElement.className.replace(/lenis(-\w+)?/g,``).trim()}}}));function le(e){let{intensity:t}=e,n=r(null);return a(()=>{if(n.current)try{n.current.scrollTo(0,{immediate:!0})}catch(e){console.error(`Error scrolling to top:`,e)}},[n]),a(()=>{let e=()=>{try{let e=document.querySelector(`[data-frameruni-stop-scroll]`),t=document.documentElement,r=t&&t.style&&t.style.overflow===`hidden`;n.current&&(e||r?n.current.stop():n.current.start())}catch(e){console.error(`Error in checkForStopScroll:`,e)}};e();let t,r;try{t=new MutationObserver(e),r=new MutationObserver(e),document&&document.documentElement&&(t.observe(document.documentElement,{childList:!0,subtree:!0,attributes:!0,attributeFilter:[`data-frameruni-stop-scroll`]}),r.observe(document.documentElement,{attributes:!0,attributeFilter:[`style`]}))}catch(e){console.error(`Error setting up observers:`,e)}return()=>{try{t&&t.disconnect(),r&&r.disconnect()}catch(e){console.error(`Error disconnecting observers:`,e)}}},[]),a(()=>{try{if(!document)return;let e=document.getElementsByTagName(`*`);for(let t=0;t<e.length;t++){let n=e[t];if(n)try{let e=s.getComputedStyle(n);e&&e.getPropertyValue(`overflow`)===`auto`&&n.setAttribute(`data-lenis-prevent`,`true`)}catch(e){console.error(`Error getting computed style:`,e)}}}catch(e){console.error(`Error in overflow detection:`,e)}},[]),a(()=>{try{if(typeof z!=`function`){console.error(`Lenis is not available`);return}n.current=new z({duration:(t||10)/10});let e=t=>{if(n.current)try{n.current.raf(t),requestAnimationFrame(e)}catch(e){console.error(`Error in animation frame:`,e)}},r=requestAnimationFrame(e);return()=>{if(cancelAnimationFrame(r),n.current)try{n.current.destroy(),n.current=null}catch(e){console.error(`Error destroying Lenis:`,e)}}}catch(e){return console.error(`Error initializing Lenis:`,e),()=>{}}},[t]),a(()=>{try{if(!document||!n.current)return;let e=Array.from(document.querySelectorAll(`a[href]`)||[]).filter(e=>{if(!e)return!1;let t=e;if(!t.href)return!1;let n=t.href.startsWith(s.location.origin)||t.href.startsWith(`./`)||t.href.startsWith(`/`),r=t.href.includes(`#`);return n&&r}).map(e=>{try{let t=e,n=t.href.includes(`#`)?`#${t.href.split(`#`).pop()}`:``,r=n?decodeURIComponent(n):``,i=0;try{if(r){let e=document.querySelector(r);if(e){let t=s.getComputedStyle(e).scrollMarginTop;i=t&&parseInt(t)||0}}}catch(e){console.error(`Error finding target element:`,e)}return{href:n,scrollMargin:i,anchorElement:t}}catch(e){return console.error(`Error processing anchor:`,e),null}}).filter(Boolean),t=(e,t,r)=>{try{e&&e.preventDefault&&e.preventDefault(),n.current&&t&&n.current.scrollTo(t,{offset:-(r||0)})}catch(e){console.error(`Error in anchor click handler:`,e)}},r=e.map(({href:e,scrollMargin:n})=>r=>t(r,e,n));return e.forEach(({anchorElement:e},t)=>{e&&r[t]&&e.addEventListener(`click`,r[t])}),()=>{e.forEach(({anchorElement:e},t)=>{e&&r[t]&&e.removeEventListener(`click`,r[t])})}}catch(e){return console.error(`Error setting up anchor links:`,e),()=>{}}},[n]),c(`div`,{style:e.style})}var B,V,ue=e((()=>{i(),f(),C(),ce(),n(),B=D(le,[`html.lenis { height: auto; }`,`.lenis.lenis-smooth { scroll-behavior: auto !important; }`,`.lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }`,`.lenis.lenis-stopped { overflow: hidden; }`,`.lenis.lenis-scrolling iframe { pointer-events: none; }`],``),V=B,B.displayName=`Smooth Scroll`,S(B,{intensity:{title:`Intensity`,type:k.Number,defaultValue:10,min:0,description:`More components at [Framer University](https://frameruni.link/cc).`}})}));function de(e,...t){let n={};return t?.forEach(t=>t&&Object.assign(n,e[t])),n}var H,U,W,G,K,fe,pe,me,he,q,ge,_e=e((()=>{f(),C(),g(),n(),M(),H=[`QX0ZzyaC5`,`F7_sKtc_m`],U=`framer-wFAMq`,W={F7_sKtc_m:`framer-v-1dtv255`,QX0ZzyaC5:`framer-v-1j1e0qh`},G={bounce:.2,delay:0,duration:.4,type:`spring`},K=({value:e,children:n})=>{let r=u(m),i=e??r.transition,a=t(()=>({...r,transition:i}),[JSON.stringify(i)]);return c(m.Provider,{value:a,children:n})},fe={Default:`QX0ZzyaC5`,Mobile:`F7_sKtc_m`},pe=_.create(o),me=({height:e,id:t,title:n,width:r,...i})=>({...i,ho9VvwuGw:n??i.ho9VvwuGw??`How do the lessons work?`,variant:fe[i.variant]??i.variant??`QX0ZzyaC5`}),he=(e,t)=>e.layoutDependency?t.join(`-`)+e.layoutDependency:t.join(`-`),q=D(l(function(e,t){let n=r(null),i=t??n,a=p(),{activeLocale:s,setLocale:l}=te(),u=ne(),{style:f,className:m,layoutId:g,variant:v,ho9VvwuGw:y,...x}=me(e),{baseVariant:S,classNames:C,clearLoadingGesture:T,gestureHandlers:E,gestureVariant:D,isLoading:k,setGestureState:A,setVariant:M,variants:N}=O({cycleOrder:H,defaultVariant:`QX0ZzyaC5`,ref:i,variant:v,variantClassNames:W}),P=he(e,N),F=b(U,re);return c(h,{id:g??a,children:c(pe,{animate:N,initial:!1,children:c(K,{value:G,children:d(_.div,{...x,...E,className:b(F,`framer-1j1e0qh`,m,C),"data-framer-name":`Default`,layoutDependency:P,layoutId:`QX0ZzyaC5`,ref:i,style:{backgroundColor:`var(--token-876e1f04-515a-4e59-97d4-5bd8e619dc84, rgb(26, 26, 26))`,borderBottomLeftRadius:12,borderBottomRightRadius:12,borderTopLeftRadius:12,borderTopRightRadius:12,...f},...de({F7_sKtc_m:{"data-framer-name":`Mobile`}},S,D),children:[c(_.div,{className:`framer-1y6njp6`,"data-framer-name":`Logo`,layoutDependency:P,layoutId:`jBn9GKLkd`,style:{backgroundColor:`var(--token-876e1f04-515a-4e59-97d4-5bd8e619dc84, rgb(26, 26, 26))`,borderBottomLeftRadius:30,borderBottomRightRadius:30,borderTopLeftRadius:30,borderTopRightRadius:30},children:c(ee,{background:{alt:``,fit:`fill`,loading:j((u?.y||0)+16+4),pixelHeight:140,pixelWidth:140,sizes:`24px`,src:`images/0aNWInESMLKyVS4TniP3rcgMVTI.png`},className:`framer-64vva`,"data-framer-name":`Logo Symbol`,layoutDependency:P,layoutId:`wa07BmbtN`})}),c(w,{__fromCanvasComponent:!0,children:c(o,{children:c(_.p,{className:`framer-styles-preset-15g2znl`,"data-styles-preset":`Cr7zSIz6f`,dir:`auto`,style:{"--framer-text-color":`var(--extracted-r6o4lv, var(--token-30c630f9-075a-4573-b5de-2aeb5699f0d5, rgb(235, 235, 235)))`},children:`How do the lessons work?`})}),className:`framer-sgqvnf`,fonts:[`Inter`],layoutDependency:P,layoutId:`q6HWQJJzv`,style:{"--extracted-r6o4lv":`var(--token-30c630f9-075a-4573-b5de-2aeb5699f0d5, rgb(235, 235, 235))`},text:y,verticalAlignment:`top`,withExternalLayout:!0})]})})})})}),[`@supports (aspect-ratio: 1) { body { --framer-aspect-ratio-supported: auto; } }`,`.framer-wFAMq.framer-elnwjq, .framer-wFAMq .framer-elnwjq { display: block; }`,`.framer-wFAMq.framer-1j1e0qh { align-content: flex-start; align-items: flex-start; display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; height: min-content; justify-content: flex-start; overflow: var(--overflow-clip-fallback, clip); padding: 16px; position: relative; width: 474px; will-change: var(--framer-will-change-override, transform); }`,`.framer-wFAMq .framer-1y6njp6 { align-content: center; align-items: center; display: flex; flex: none; flex-direction: row; flex-wrap: nowrap; gap: 10px; height: min-content; justify-content: center; overflow: var(--overflow-clip-fallback, clip); padding: 4px; position: relative; width: min-content; will-change: var(--framer-will-change-override, transform); }`,`.framer-wFAMq .framer-64vva { flex: none; height: 24px; overflow: var(--overflow-clip-fallback, clip); position: relative; width: 24px; will-change: var(--framer-will-change-filter-override, filter); }`,`.framer-wFAMq .framer-sgqvnf { --framer-text-wrap-override: balance; flex: 1 0 0px; height: auto; position: relative; width: 1px; }`,`.framer-wFAMq.framer-v-1dtv255.framer-1j1e0qh { width: 266px; }`,...N],`framer-wFAMq`),ge=q,q.displayName=`Answer`,q.defaultProps={height:64,width:474},S(q,{variant:{options:[`QX0ZzyaC5`,`F7_sKtc_m`],optionTitles:[`Default`,`Mobile`],title:`Variant`,type:k.Enum},ho9VvwuGw:{defaultValue:`How do the lessons work?`,displayTextArea:!0,title:`Title`,type:k.String},onho9VvwuGwChange:{changes:`ho9VvwuGw`,type:k.ChangeHandler}}),A(q,[{explicitInter:!0,fonts:[{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F`,url:`fonts/5vvr9Vy74if2I6bQbJvbw7SY1pQ.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`,url:`fonts/EOr0mi4hNtlgWNn9if640EZzXCo.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+1F00-1FFF`,url:`fonts/Y9k9QrlZAqio88Klkmbd8VoMQc.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0370-03FF`,url:`fonts/OYrD2tBIBPvoJXiIHnLoOXnY9M.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF`,url:`fonts/JeYwfuaPfZHQhEG8U5gtPDZ7WQ.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2070, U+2074-207E, U+2080-208E, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`,url:`fonts/GrgcKwrN6d3Uz8EwcLHZxwEfC4.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB`,url:`fonts/b6Y37FthZeALduNqHicBT6FutY.woff2`,weight:`400`}]},...x(P)],{supportsExplicitInterCodegen:!0})})),ve,ye,be,xe=e((()=>{C(),v.loadFonts([`Inter`,`Inter-Bold`,`Inter-BoldItalic`,`Inter-Italic`]),ve=[{explicitInter:!0,fonts:[{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F`,url:`fonts/5vvr9Vy74if2I6bQbJvbw7SY1pQ.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`,url:`fonts/EOr0mi4hNtlgWNn9if640EZzXCo.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+1F00-1FFF`,url:`fonts/Y9k9QrlZAqio88Klkmbd8VoMQc.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0370-03FF`,url:`fonts/OYrD2tBIBPvoJXiIHnLoOXnY9M.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF`,url:`fonts/JeYwfuaPfZHQhEG8U5gtPDZ7WQ.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2070, U+2074-207E, U+2080-208E, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`,url:`fonts/GrgcKwrN6d3Uz8EwcLHZxwEfC4.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB`,url:`fonts/b6Y37FthZeALduNqHicBT6FutY.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F`,url:`fonts/DpPBYI0sL4fYLgAkX8KXOPVt7c.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`,url:`fonts/4RAEQdEOrcnDkhHiiCbJOw92Lk.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+1F00-1FFF`,url:`fonts/1K3W8DizY3v4emK8Mb08YHxTbs.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0370-03FF`,url:`fonts/tUSCtfYVM1I1IchuyCwz9gDdQ.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF`,url:`fonts/VgYFWiwsAC5OYxAycRXXvhze58.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2070, U+2074-207E, U+2080-208E, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`,url:`fonts/syRNPWzAMIrcJ3wIlPIP43KjQs.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB`,url:`fonts/GIryZETIX4IFypco5pYZONKhJIo.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F`,url:`fonts/H89BbHkbHDzlxZzxi8uPzTsp90.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`,url:`fonts/u6gJwDuwB143kpNK1T1MDKDWkMc.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+1F00-1FFF`,url:`fonts/43sJ6MfOPh1LCJt46OvyDuSbA6o.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0370-03FF`,url:`fonts/wccHG0r4gBDAIRhfHiOlq6oEkqw.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF`,url:`fonts/WZ367JPwf9bRW6LdTHN8rXgSjw.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2070, U+2074-207E, U+2080-208E, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`,url:`fonts/ia3uin3hQWqDrVloC1zEtYHWw.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB`,url:`fonts/2A4Xx7CngadFGlVV4xrO06OBHY.woff2`,weight:`700`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F`,url:`fonts/CfMzU8w2e7tHgF4T4rATMPuWosA.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`,url:`fonts/867QObYax8ANsfX4TGEVU9YiCM.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+1F00-1FFF`,url:`fonts/Oyn2ZbENFdnW7mt2Lzjk1h9Zb9k.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0370-03FF`,url:`fonts/cdAe8hgZ1cMyLu9g005pAW3xMo.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF`,url:`fonts/DOfvtmE1UplCq161m6Hj8CSQYg.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2070, U+2074-207E, U+2080-208E, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`,url:`fonts/pKRFNWFoZl77qYCAIp84lN1h944.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`italic`,uiFamilyName:`Inter`,unicodeRange:`U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB`,url:`fonts/tKtBcDnBMevsEEJKdNGhhkLzYo.woff2`,weight:`400`}]}],ye=[`.framer-kK7qJ .framer-styles-preset-il0avn:not(.rich-text-wrapper), .framer-kK7qJ .framer-styles-preset-il0avn.rich-text-wrapper p { --framer-font-family: "Inter", "Inter Placeholder", sans-serif; --framer-font-family-bold: "Inter", "Inter Placeholder", sans-serif; --framer-font-family-bold-italic: "Inter", "Inter Placeholder", sans-serif; --framer-font-family-italic: "Inter", "Inter Placeholder", sans-serif; --framer-font-open-type-features: 'blwf' on, 'cv09' on, 'cv03' on, 'cv04' on, 'cv11' on; --framer-font-size: 18px; --framer-font-style: normal; --framer-font-style-bold: normal; --framer-font-style-bold-italic: italic; --framer-font-style-italic: italic; --framer-font-variation-axes: normal; --framer-font-weight: 400; --framer-font-weight-bold: 700; --framer-font-weight-bold-italic: 700; --framer-font-weight-italic: 400; --framer-letter-spacing: -0.02em; --framer-line-height: 1.5em; --framer-paragraph-spacing: 20px; --framer-text-alignment: start; --framer-text-color: #666666; --framer-text-decoration: none; --framer-text-stroke-color: initial; --framer-text-stroke-width: initial; --framer-text-transform: none; }`],be=`framer-kK7qJ`})),J,Se,Ce,we,Te,Ee,Y,X,De=e((()=>{f(),C(),n(),J=`var(--framer-icon-mask)`,Se=l(function(e,t){return c(`svg`,{...e,ref:t,children:e.children})}),Ce=_.create(Se),we=l((e,t)=>{let{animated:n,layoutId:r,children:i,...a}=e;return n?c(Ce,{...a,layoutId:r,ref:t,children:i}):c(`svg`,{...a,ref:t,children:i})}),Te=`<svg display="block" role="presentation" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M 0 9 C 0 4.029 4.029 0 9 0 C 13.971 0 18 4.029 18 9 C 18 13.971 13.971 18 9 18 C 4.029 18 0 13.971 0 9 Z" fill-opacity="var(--1m6trwb, 0)" fill="var(--21h8s6, rgb(0, 0, 0))" height="18px" id="RjBoUvnZP" transform="translate(3 3)" width="18px"/><path d="M 0 1.125 C 0 0.504 0.504 0 1.125 0 C 1.746 0 2.25 0.504 2.25 1.125 C 2.25 1.746 1.746 2.25 1.125 2.25 C 0.504 2.25 0 1.746 0 1.125 Z" fill="var(--21h8s6, rgb(0, 0, 0))" height="2.25px" id="H_DiuDuLW" transform="translate(10.875 15.75)" width="2.25px"/><path d="M 3 6 L 3 5.25 C 4.657 5.25 6 4.074 6 2.625 C 6 1.176 4.657 0 3 0 C 1.343 0 0 1.176 0 2.625 L 0 3" fill="transparent" height="6px" id="RWXAz0cuD" stroke-dasharray="" stroke-linecap="round" stroke-linejoin="round" stroke-width="var(--pgex8v, 1.5)" stroke="var(--21h8s6, rgb(0, 0, 0))" transform="translate(9 7.5)" width="6px"/><path d="M 0 9 C 0 4.029 4.029 0 9 0 C 13.971 0 18 4.029 18 9 C 18 13.971 13.971 18 9 18 C 4.029 18 0 13.971 0 9 Z" fill="transparent" height="18px" id="mmzn1Nlhi" stroke-dasharray="" stroke-linecap="round" stroke-linejoin="round" stroke-width="var(--pgex8v, 1.5)" stroke="var(--21h8s6, rgb(0, 0, 0))" transform="translate(3 3)" width="18px"/></svg>`,Ee=({alpha:e,color:t,height:n,id:r,width:i,width1:a,...o})=>({...o,ezTt3ayMo:t??o.ezTt3ayMo??`rgb(0, 0, 0)`,lschgej4H:a??o.lschgej4H??1.5,qxTvv_EBh:e??o.qxTvv_EBh}),Y=D(l(function(e,t){let{style:n,className:r,layoutId:i,variant:a,ezTt3ayMo:o,lschgej4H:s,qxTvv_EBh:l,...u}=Ee(e),d=T(`1059275922`,Te);return c(we,{...u,className:b(`framer-5REFZ`,r),layoutId:i,ref:t,role:`presentation`,style:{"--1m6trwb":l,"--21h8s6":o,"--pgex8v":s,...n},viewBox:`0 0 24 24`,children:c(`use`,{href:d})})}),[`.framer-5REFZ { -webkit-mask: ${J}; aspect-ratio: 1; display: block; mask: ${J}; width: 24px; }`],`framer-5REFZ`),Y.displayName=`Question`,X=Y,S(Y,{ezTt3ayMo:{defaultValue:`rgb(0, 0, 0)`,hidden:!1,title:`Color`,type:k.Color},lschgej4H:{defaultValue:1.5,displayStepper:!0,hidden:!1,max:6,min:0,step:.5,title:`Width`,type:k.Number},qxTvv_EBh:{defaultValue:0,displayStepper:!0,hidden:!1,max:1,min:0,step:.1,title:`Alpha`,type:k.Number}})}));function Oe(e,...t){let n={};return t?.forEach(t=>t&&Object.assign(n,e[t])),n}var ke,Ae,je,Me,Z,Ne,Pe,Fe,Ie,Le,Q,$,Re=e((()=>{f(),C(),g(),n(),De(),M(),ke=y(X),Ae=[`maQebAjM_`,`lYLZ5eC2_`],je=`framer-N87X5`,Me={lYLZ5eC2_:`framer-v-fk7zxd`,maQebAjM_:`framer-v-ry8vic`},Z={bounce:.2,delay:0,duration:.4,type:`spring`},Ne=({value:e,children:n})=>{let r=u(m),i=e??r.transition,a=t(()=>({...r,transition:i}),[JSON.stringify(i)]);return c(m.Provider,{value:a,children:n})},Pe={Default:`maQebAjM_`,Mobile:`lYLZ5eC2_`},Fe=_.create(o),Ie=({height:e,id:t,title:n,width:r,...i})=>({...i,jhs0SESMn:n??i.jhs0SESMn??`How do the lessons work?`,variant:Pe[i.variant]??i.variant??`maQebAjM_`}),Le=(e,t)=>e.layoutDependency?t.join(`-`)+e.layoutDependency:t.join(`-`),Q=D(l(function(e,t){let n=r(null),i=t??n,a=p(),{activeLocale:s,setLocale:l}=te();ne();let{style:u,className:f,layoutId:m,variant:g,jhs0SESMn:v,...y}=Ie(e),{baseVariant:x,classNames:S,clearLoadingGesture:C,gestureHandlers:T,gestureVariant:E,isLoading:ee,setGestureState:D,setVariant:k,variants:A}=O({cycleOrder:Ae,defaultVariant:`maQebAjM_`,ref:i,variant:g,variantClassNames:Me}),j=Le(e,A),M=b(je,re);return c(h,{id:m??a,children:c(Fe,{animate:A,initial:!1,children:c(Ne,{value:Z,children:d(_.div,{...y,...T,className:b(M,`framer-ry8vic`,f,S),"data-framer-name":`Default`,layoutDependency:j,layoutId:`maQebAjM_`,ref:i,style:{backgroundColor:`var(--token-1fbeec3b-2fa0-43b0-9dc4-1c6c61dc9286, rgb(51, 51, 51))`,borderBottomLeftRadius:12,borderBottomRightRadius:12,borderTopLeftRadius:12,borderTopRightRadius:12,...u},...Oe({lYLZ5eC2_:{"data-framer-name":`Mobile`}},x,E),children:[c(X,{animated:!0,className:`framer-1nfux9i`,layoutDependency:j,layoutId:`g1Tf_qIFV`,style:{"--1m6trwb":0,"--21h8s6":`var(--token-8e00c4c6-e35a-497b-8493-22db709dc22b, rgb(0, 153, 255))`,"--pgex8v":1.5}}),c(w,{__fromCanvasComponent:!0,children:c(o,{children:c(_.p,{className:`framer-styles-preset-15g2znl`,"data-styles-preset":`Cr7zSIz6f`,dir:`auto`,style:{"--framer-text-color":`var(--extracted-r6o4lv, var(--token-30c630f9-075a-4573-b5de-2aeb5699f0d5, rgb(235, 235, 235)))`},children:`How do the lessons work?`})}),className:`framer-ya4ila`,fonts:[`Inter`],layoutDependency:j,layoutId:`ZbMmTFK83`,style:{"--extracted-r6o4lv":`var(--token-30c630f9-075a-4573-b5de-2aeb5699f0d5, rgb(235, 235, 235))`},text:v,verticalAlignment:`top`,withExternalLayout:!0})]})})})})}),[`@supports (aspect-ratio: 1) { body { --framer-aspect-ratio-supported: auto; } }`,`.framer-N87X5.framer-1yer4b2, .framer-N87X5 .framer-1yer4b2 { display: block; }`,`.framer-N87X5.framer-ry8vic { align-content: center; align-items: center; display: flex; flex-direction: row; flex-wrap: nowrap; gap: 10px; height: min-content; justify-content: flex-start; overflow: var(--overflow-clip-fallback, clip); padding: 16px; position: relative; width: min-content; will-change: var(--framer-will-change-override, transform); }`,`.framer-N87X5 .framer-1nfux9i { flex: none; height: var(--framer-aspect-ratio-supported, 24px); position: relative; width: 24px; }`,`.framer-N87X5 .framer-ya4ila { flex: none; height: auto; position: relative; white-space: pre; width: auto; }`,`.framer-N87X5.framer-v-fk7zxd.framer-ry8vic { width: 291px; }`,`.framer-N87X5.framer-v-fk7zxd .framer-ya4ila { flex: 1 0 0px; white-space: pre-wrap; width: 1px; word-break: break-word; word-wrap: break-word; }`,...N],`framer-N87X5`),$=Q,Q.displayName=`Question`,Q.defaultProps={height:56,width:257},S(Q,{variant:{options:[`maQebAjM_`,`lYLZ5eC2_`],optionTitles:[`Default`,`Mobile`],title:`Variant`,type:k.Enum},jhs0SESMn:{defaultValue:`How do the lessons work?`,displayTextArea:!0,title:`Title`,type:k.String},onjhs0SESMnChange:{changes:`jhs0SESMn`,type:k.ChangeHandler}}),A(Q,[{explicitInter:!0,fonts:[{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F`,url:`fonts/5vvr9Vy74if2I6bQbJvbw7SY1pQ.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116`,url:`fonts/EOr0mi4hNtlgWNn9if640EZzXCo.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+1F00-1FFF`,url:`fonts/Y9k9QrlZAqio88Klkmbd8VoMQc.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0370-03FF`,url:`fonts/OYrD2tBIBPvoJXiIHnLoOXnY9M.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF`,url:`fonts/JeYwfuaPfZHQhEG8U5gtPDZ7WQ.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2070, U+2074-207E, U+2080-208E, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`,url:`fonts/GrgcKwrN6d3Uz8EwcLHZxwEfC4.woff2`,weight:`400`},{cssFamilyName:`Inter`,source:`framer`,style:`normal`,uiFamilyName:`Inter`,unicodeRange:`U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB`,url:`fonts/b6Y37FthZeALduNqHicBT6FutY.woff2`,weight:`400`}]},...ke,...x(P)],{supportsExplicitInterCodegen:!0})}));export{ve as a,_e as c,F as d,ie as f,ye as i,V as l,Re as n,xe as o,be as r,ge as s,$ as t,ue as u};
//# sourceMappingURL=YT_RD1whJ.CDvdMYBy.mjs.map