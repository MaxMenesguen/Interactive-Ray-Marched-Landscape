#version 300 es
precision highp float;

#define MAX_DIST 20.0 
#define STEPS 250
#define PI 3.141592
#define DEG2GRAD 0.01745329251

//variable de préprocesseur, comme une variable globale
uniform vec2 u_resolution; // Screen resolution (width, height)
uniform float u_time; // Elapsed time
uniform vec4 u_mouse; // Mouse position and state

in vec2 f_uv; // Fragment UV coordinates

out vec4 fragColor; // Output color of the fragment

vec2 dPlane (vec3 p, float h, float i) {
    return vec2(i ,p.y -h);
}



// Distance function for terrain with a base height
vec2 dTerrain(vec3 p, float baseHeight, float i) {
    float height = baseHeight + sin(p.x * 0.5) * 0.5 + cos(p.z * 0.3) * 0.5;
    return vec2(i, p.y - height);
}

vec2 dSphere (vec3 p, float r, float i) {
    return vec2 (i ,length(p) - r) ;
}

vec2 dTorus (vec3 p, float r, float t, float i){
    return vec2 (i, length(vec2(length(p.xz) - r, p.y)) - t);
}

vec2 dBox (vec3 p, vec3 s, float i) {
    vec3 diff = abs(p) - s;
    
    float dE = length(max(diff, 0.0));
    
    float d = dE;
    
    return vec2 (i,d);
}


vec2 minvec2 (vec2 a, vec2 b){
    return a.y< b.y ? a: b;
}


vec2 scene (vec3 p){//si on prends le d minimum entre deux objects, 
//ça nous donera la distance avec l'object le plus proche pour ce pixel la 
    //vec2 dp = dPlane(p, -0.0, 0.0);
    vec2 dt1 = dTerrain(p - vec3 (0), -1.0, 0.0);
    vec2 ds =  dSphere (p - vec3 (0,0.0,0.0), 0.5, 1.0);
    vec2 ds2 = dSphere (p - vec3 (-0.5,0.5,0.5), 0.3, 2.0);
    vec2 dt = dTorus (p - vec3 (0.0, 0.5,0.0), 0.8, 0.1, 3.0);
    vec2 db = dBox (p - vec3 (0.6,0.4,-0.4), vec3 (0.1, 0.2, 0.3), 4.0);
    
    return minvec2(db, minvec2(dt,minvec2 (dt1, minvec2 (ds, ds2))));
}


vec2 march (vec3 rO, vec3 rD){

    vec3 cP = rO;
    float d = 0.0;
    vec2 s = vec2(0.0);
    
    for (int i = 0; i < STEPS; i++){
        cP = rO + rD * d;
        s = scene(cP);
        d+= s.y;
        
        if (s.y < 0.0001){ //objet touché !
            break;
        }
        
        if (d > 20.0){//Décor !
            return vec2 (100.0,MAX_DIST + 10.0);
        }
    }
    s.y = d;
    return s;
    
}

vec3 normal (vec3 p){
    float dP = scene (p).y;
    /*float eps = 0.01;
    
    float dx = scene(p + vec3 (eps,0,0)).y- dP;
    float dy = scene(p + vec3 (0,eps,0)).y- dP;
    float dz = scene(p + vec3 (0,0,eps)).y- dP;*/
    
    vec2 eps = vec2 (0.01,0.0);
    
    float dx = scene(p + eps.xyy).y- dP;
    float dy = scene(p + eps.yxy).y- dP;
    float dz = scene(p + eps.yyx).y- dP;
    
    return normalize (vec3 (dx,dy,dz));

}

float lighting (vec3 p, vec3 n) {//n la normal 
    //vec2 mouse = iMouse.xy / iResolution.xy;
    //vec3 lightPose = vec3 (mouse.x*2.0,2,mouse.y*2.0);
    vec3 lightPose = vec3 (cos(u_time)* 3.0,2.0,sin(u_time)*3.0);
    //vec3 lightPose = vec3 (3,2,-0.5);// Position de la lumière
    vec3 lightDir = lightPose -p;
    vec3 lN = normalize (lightDir);
    
    //regarder si un obstacle est entre le point de lumière et p pour faire une ombre 
    if (march(p + n*0.001 ,lN).y < length (lightDir)){//on décale par un petit nombre pour pas instentanément march dans l'objet
        return 0.0;
    }
    return max (0.0, dot(n,lN));
}
vec3 material (float i){
    
    vec3 col = vec3(0,0,0);
    
    if (i < 0.5){
        col = vec3 (2.0, 4.0, 0.5);
    }else if (i < 1.5){
        col = vec3 (3, 0,0.5);
    }else if (i < 2.5){
        col = vec3 (0, 1, 3.0);
    }else if (i < 3.5){
        col = vec3 (0.3, 0.3, 0.5);
    }else if (i < 4.5){
        col = vec3 (3.0, 0.6, 0.1);
    }
    
    
    return col * vec3(0.2);//pour moddifier l'intensité de la lumière 
}

void main() {
    // Normalize fragment coordinates to [-1, 1] and adjust for resolution aspect ratio
    vec2 uv = (f_uv * 2.0 - 1.0) * u_resolution / u_resolution.y;
    vec2 mouse = (normalize (u_mouse.xy / u_resolution.xy) - 0.5); // Normalize mouse position
    float initAngle = -DEG2GRAD * 90.0; // Initial camera angle adjustment

    // caméra qui en fonction de la pose de la sourie
    vec3 rO = vec3(cos(mouse.x * 2.0 * PI + initAngle) * 2.0, mouse.y + 0.5, sin(mouse.x * 2.0 * PI + initAngle) * 2.0);
    vec3 target = vec3(0, 0.0, 0); // Camera target point (origin)
    vec3 fwd = normalize(target - rO); // Forward direction from camera to target
    vec3 side = normalize(cross(vec3(0, 1.0, 0), fwd)); //cross product pour trouver un vecteur perpendiculaire
    vec3 up = cross(fwd, side); // pas besoin de normalier car cross de deux normaliser donne un normaliser 

    // Calculate ray direction
    vec3 screenPos = rO + (fwd + side * uv.x + up * uv.y); // Position on the virtual screen
    vec3 rD = normalize(screenPos - rO); //eye peut sauté ici 

    // Perform ray marching to find the closest object
    vec2 s = march(rO, rD);
    float d = s.y; // Distance to the closest object

    // Background color gradient
    vec3 col = mix(vec3(1.0), vec3(0.0, 0.0, 1.0), uv.y + 0.3);

    // If an object is hit, calculate its color, lighting, and shading
    if (d < MAX_DIST) {
        col = material(s.x); // Get the object's material color
        vec3 p = rO + rD * d; // Calculate the hit point
        vec3 n = normal(p); // Calculate the normal at the hit point
        float l = lighting(p, n); // Calculate the lighting
        vec3 ambient = vec3(5.0, 0, 10.0) * 0.02; // Ambient light un peu violiet parce que c'est cool
        col = col * (ambient + l); // Combine ambient and diffuse lighting
    }

    // Apply gamma correction
    col = pow(col, vec3(0.4545));//valeur de la courbe de correction du gama standard 
    fragColor = vec4(col.rgb, 1.0); // Set the final fragment color
}
