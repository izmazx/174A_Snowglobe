import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;


export class Snowglobe extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.sG = false;
        this.pos = [];
        this.pos2 = [];
        this.snow_amount = 30;
        this.pan = false;
        this.in = false;
        this.start_time = 0;
        this.end_time = 0;
        this.pos_ndcs_near = vec4(0,0,0,0);
        this.cumalative_clicks = [];

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 30),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 30),
            // TODO:  Fill in as many additional shape instances as needed in this key/value table.
            //        (Requirement 1)
            cone: new defs.Closed_Cone(1, 15),
            pillar: new defs.Cube(),
            triangle: new defs.Triangle(),
            cylinder: new defs.Cylindrical_Tube(1, 30),
        }

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: 0.4, diffusivity: 1, specularity: 1, color : hex_color("#ffffff")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .2, diffusivity: 1, specularity: 1, color: hex_color("#992828")}),
            ring: new Material(new Ring_Shader()),
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
            //        (Requirement 4)
            glass: new Material(new defs.Phong_Shader(),
                {ambient: 0.01, diffusivity: 0.30, specularity: 1, color: vec4(0.827,0.914,0.929, .3)}),
            royce: new Material(new defs.Phong_Shader(),
                {ambient: 0.8, diffusivity: 1, color: hex_color("#daae8b")}),
            front: new Material(new defs.Phong_Shader(),
                {ambient: 0.8, diffusivity: 1, color: hex_color("#c49a77")}),
            cone: new Material(new Gouraud_Shader(),
                {ambient: 0.8, diffusivity: 1, color: hex_color("#c49a77")}),
            middle: new Material(new Gouraud_Shader(),
                {ambient: 0.8, diffusivity: 1, color: hex_color("#8c8c8c")}),
            snowfall: new Material(new Snow_Shader(),
                {color: hex_color("#ffffff"), op: .4}),
            lamp: new Material(new defs.Phong_Shader(),
                 {ambient: 1, diffusivity: 0, color: hex_color("#f7d497")}),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 30), vec3(0, 0, 0), vec3(0, 1, 0)).times(Mat4.translation(0, -15, -40));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View snow globe", ["Control", "0"], () => this.attached = () => null);
        this.new_line();
        this.key_triggered_button("View inside", ["Control", "1"], () => this.attached = () => this.planet_1);
        this.key_triggered_button("Generate snow", ["Control", "2"], this.snow_generator);
        this.new_line();
    }

    my_mouse_down(e, pos, context, program_state) {
        this.pos_ndcs_near = vec4(pos[0], pos[1], -1.0, 1.0);
        if(this.pos_ndcs_near[0] < 0) {
            this.cumalative_clicks.push(-1);
        }
        if(this.pos_ndcs_near[0] > 0) {
            this.cumalative_clicks.push(1);
        }

        this.start_time = program_state.animation_time / 1000;
        this.end_time = (program_state.animation_time + 300) / 1000;
    }

    snow_generator() {
        this.sG = true;
        this.pos = [];
        this.pos2 = [];

        for (let j = 0; j < this.snow_amount; j++) {
            let px = Math.random() * Math.pow(-1, Math.floor(Math.random() * 10));
            let py = Math.random(); // only positive y hemisphere generates snow
            let pz = Math.random() * Math.pow(-1, Math.floor(Math.random() * 10));
            if (px == 0 && py == 0 && pz == 0) {
                px = Math.random();
                py = Math.random();
                pz = Math.random();
            }
            let c = (1 / (Math.sqrt(px * px + py * py + pz * pz)));
            px = px * c * 21;
            py = py * c * 21;
            pz = pz * c * 21;

            let p = [];
            p.push(px, py, pz);
            this.pos.push(p);
        }

        for (let j = 0; j < this.snow_amount; j++) {
            let px = Math.random() * Math.pow(-1, Math.floor(Math.random() * 10));
            let py = Math.random(); // only positive y hemisphere generates snow
            let pz = Math.random() * Math.pow(-1, Math.floor(Math.random() * 10));
            if (px == 0 && py == 0 && pz == 0) {
                px = Math.random();
                py = Math.random();
                pz = Math.random();
            }
            let c = (1 / (Math.sqrt(px * px + py * py + pz * pz)));
            px = px * c * 21;
            py = py * c * 21;
            pz = pz * c * 21;

            let p = [];
            p.push(px, py, pz);
            this.pos2.push(p);
        }
    }


    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        let canvas = context.canvas;
        const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>
            vec((e.clientX - (rect.left + rect.right) / 2) / ((rect.right - rect.left) / 2),
                (e.clientY - (rect.bottom + rect.top) / 2) / ((rect.top - rect.bottom) / 2));

        canvas.addEventListener("mousedown", e => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect()
            console.log("e.clientX: " + e.clientX);
            console.log("e.clientX - rect.left: " + (e.clientX - rect.left));
            console.log("e.clientY: " + e.clientY);
            console.log("e.clientY - rect.top: " + (e.clientY - rect.top));
            console.log("mouse_position(e): " + mouse_position(e));
            if (this.in) {
                this.pan = true;
            }
            this.my_mouse_down(e, mouse_position(e), context, program_state);
        });

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        let model_transform = Mat4.identity();
        let mT = Mat4.identity();

        if(!this.pan) {
            this.planet_1 = mT.times(Mat4.translation(-6, 10, 12)).times(Mat4.rotation(.8, -.4, -.3, 0));
        }

        let tot_rot_left = 0;
        let tot_rot_right = 0;

        for (let i = 0; i < this.cumalative_clicks.length; i++) {
            if (this.cumalative_clicks[this.cumalative_clicks.length - i - 1] < 0) { tot_rot_left++; }
            if (this.cumalative_clicks[this.cumalative_clicks.length - i - 1] > 0) { tot_rot_right++; }
        }
        let t_click = (t - this.start_time) / (this.end_time - this.start_time);

        if(this.pan) {
            if (this.pos_ndcs_near[0] > 0) {
                if (t <= this.end_time && t >= this.start_time) {
                    model_transform = mT
                        .times(Mat4.translation(4, 2, 0))
                        .times(Mat4.rotation((tot_rot_right / 500) * (t_click / 2), 0, 1, 0))
                        .times(Mat4.rotation(.8, -.4, -.3, 0))
                        .times(Mat4.translation(0, 0, 15));
                    this.planet_1 = model_transform;
                }
            }
            else if (this.pos_ndcs_near[0] < 0) {
                if (t <= this.end_time && t >= this.start_time) {
                    let t_click = (t - this.start_time) / (this.end_time - this.start_time);
                    model_transform = mT
                        .times(Mat4.translation(4, 2, 0))
                        .times(Mat4.rotation((tot_rot_left / 500) * (t_click / 2), 0, -1, 0))
                        .times(Mat4.rotation(.8, -.4, -.3, 0))
                        .times(Mat4.translation(0, 0, 15));
                    this.planet_1 = model_transform;
                }
            }
        }

        if (this.attached != null) {
            if (this.attached() == null) {
                program_state.set_camera(this.initial_camera_location);
            }
            else {
                let desired = this.attached();
                desired = desired.times(Mat4.translation(0,0,5));
                desired = Mat4.inverse(desired);
                this.in = true;
                program_state.camera_inverse = desired.map((x,i) =>
                    Vector.from(program_state.camera_inverse[i]).mix(x, 0.1))
            }
        }

        program_state.lights = [];

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // TODO: lamps, trees
        const lamp_color = hex_color("#ffd478");
        let lamp_size = 1.5;
        program_state.lights.push(new Light(vec4(-1,-2,10,1), lamp_color, 10**lamp_size));
        program_state.lights.push(new Light(vec4(8,-2,10,1), lamp_color, 10**lamp_size));
        model_transform = mT.times(Mat4.translation(-1, -1, 10)).times(Mat4.scale(.5,.5,.5));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.lamp);
        model_transform = mT.times(Mat4.translation(-1, -3, 10)).times(Mat4.rotation(Math.PI / 2, 1, 0 ,0)).times(Mat4.scale(.08, .08, 4));
        this.shapes.cylinder.draw(context, program_state, model_transform, this.materials.test.override({color: hex_color("#000000")}));
        model_transform = mT.times(Mat4.translation(8, -1, 10)).times(Mat4.scale(.5,.5,.5));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.lamp);
        model_transform = mT.times(Mat4.translation(8, -3, 10)).times(Mat4.rotation(Math.PI / 2, 1, 0 ,0)).times(Mat4.scale(.08, .08, 4));
        this.shapes.cylinder.draw(context, program_state, model_transform, this.materials.test.override({color: hex_color("#000000")}));

        model_transform = mT.times(Mat4.translation(-7, -1, 7)).times(Mat4.scale(1, 1, 1)).times(Mat4.rotation(Math.PI / 2, -1, 0,0));
        this.shapes.cone.draw(context, program_state, model_transform, this.materials.test2.override({color: hex_color("#1f5204")}));
        model_transform = mT.times(Mat4.translation(-7, -1.8, 7)).times(Mat4.scale(1.1, .9, 1.1)).times(Mat4.rotation(Math.PI / 2, -1, 0,0));
        this.shapes.cone.draw(context, program_state, model_transform, this.materials.test2.override({color: hex_color("#1f5204")}));
        model_transform = mT.times(Mat4.translation(-7, -2.5, 7)).times(Mat4.scale(1.3, .9, 1.3)).times(Mat4.rotation(Math.PI / 2, -1, 0,0));
        this.shapes.cone.draw(context, program_state, model_transform, this.materials.test2.override({color: hex_color("#1f5204")}));
        model_transform = mT.times(Mat4.translation(-7, -5, 7)).times(Mat4.rotation(Math.PI / 2, 1, 0 ,0)).times(Mat4.scale(.4, .4, 3));
        this.shapes.cylinder.draw(context, program_state, model_transform, this.materials.test.override({color: hex_color("#522604")}));


        // TODO:  Royce Hall building
        model_transform = mT;
        model_transform = model_transform.times(Mat4.scale(1,5,1))
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.royce);//left pillar

        model_transform = model_transform.times(Mat4.translation(0,1.2,0)).times(Mat4.scale(1,2/10,1/1)).times(Mat4.rotation(Math.PI/2,-1,0,0));
        this.shapes.cone.draw(context, program_state, model_transform, this.materials.cone);//left cone
        model_transform = model_transform.times(Mat4.rotation(-Math.PI/2,-1,0,0)).times(Mat4.scale(1,10/2,1/1)).times(Mat4.translation(0,-1.2,0));

        model_transform = model_transform.times(Mat4.translation(-4,-.6,-2)).times(Mat4.scale(3,2/5,1));
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.royce);//left base
        model_transform = model_transform.times(Mat4.scale(1/3,5/2,1)).times(Mat4.translation(4,.6,2));

        model_transform = model_transform.times(Mat4.translation(8,0,0))
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.royce); //right pillar

        model_transform = model_transform.times(Mat4.translation(0,1.2,0)).times(Mat4.scale(1,2/10,1/1)).times(Mat4.rotation(Math.PI/2,-1,0,0));
        this.shapes.cone.draw(context, program_state, model_transform, this.materials.cone); //right cone
        model_transform = model_transform.times(Mat4.rotation(-Math.PI/2,-1,0,0)).times(Mat4.scale(1,10/2,1/1)).times(Mat4.translation(0,-1.2,0));

        model_transform = model_transform.times(Mat4.translation(4,-.6,-2)).times(Mat4.scale(3,2/5,1));
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.royce); //right base
        model_transform = model_transform.times(Mat4.scale(1/3,5/2,1)).times(Mat4.translation(-4,.6,2));

        model_transform = model_transform.times(Mat4.translation(-4,-.4,0)).times(Mat4.scale(3,3/5,1));
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.front);//front of building

        model_transform = model_transform.times(Mat4.translation(0,1,0)).times(Mat4.scale(1,1/2,1));
        this.shapes.triangle.draw(context, program_state, model_transform, this.materials.front);//triangle at front
        model_transform = model_transform.times(Mat4.rotation(Math.PI, 0, 1, 0))
        this.shapes.triangle.draw(context, program_state, model_transform, this.materials.front);//triangle at front
        model_transform = model_transform.times(Mat4.rotation(-Math.PI, 0, 1, 0))
        model_transform = model_transform.times(Mat4.scale(1,2,1)).times(Mat4.translation(0,-1,0));

        model_transform = model_transform.times(Mat4.translation(0,0,-7)).times(Mat4.scale(5/3,1,6));
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.middle); //middle grey block

        model_transform = model_transform.times(Mat4.scale(1,1/2,1)).times(Mat4.translation(1,-1,-1/3));
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.middle); //right grey block

        model_transform = model_transform.times(Mat4.translation(-2,0,0));
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.middle); //left grey block

        model_transform = model_transform.times(Mat4.scale(1/10,1,1)).times(Mat4.translation(-11,0,0));
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.royce); //right base
        model_transform = model_transform.times(Mat4.translation(42,0,0));
        this.shapes.pillar.draw(context, program_state, model_transform, this.materials.royce); //right base

        //TODO: ground (Interior of globe must be drawn before the glass sphere to be visible)
        model_transform = mT.times(Mat4.translation(4, -5, 0)).times(Mat4.rotation(Math.PI * .5, 1, 0, 0)).times(Mat4.scale(19,19,1/4));
        this.shapes.circle.draw(context, program_state, model_transform, this.materials.test);
        this.shapes.cylinder.draw(context, program_state, model_transform, this.materials.test);
        while (t > 90) //reset after 90 seconds
            t = t-90;
        for (let i = 0; i < t; i++) {
            model_transform = model_transform.times(Mat4.translation(0,0,-0.1));
            this.shapes.circle.draw(context, program_state, model_transform, this.materials.test);
            this.shapes.cylinder.draw(context, program_state, model_transform, this.materials.test);
        }
        program_state.lights.pop();
        program_state.lights.pop();

        //TODO: Snowfall
        //periodic motion of snowfall
        let p = Math.abs(Math.sin(t / 2));
        if ((Math.floor(t / (Math.PI))) % 2 == 0) {
            p = Math.abs(Math.cos(t / 2));
        }
        let p2 = Math.abs(Math.sin(t / 3));
        if ((Math.floor(t / (3 * Math.PI / 2))) % 2 == 0) {
            p2 = Math.abs(Math.cos(t / 3));
        }


        if (this.sG) {
            //apply randomly generated positions
            for (let i = 0; i < this.snow_amount; i++) {
                let qx = this.pos[i][0];
                let qy = this.pos[i][1];
                let qz = this.pos[i][2];
                model_transform = mT
                    .times(Mat4.translation(qx + 4, qy * p + 5, qz))
                    .times(Mat4.translation(-1, 0 , 0))
                    .times(Mat4.rotation(Math.sin(qy * t / 5), 0, 1, 0))
                    .times(Mat4.translation(1, 0 , 0))
                    .times(Mat4.scale(0.2, 0.2, 0.2));
                this.shapes.sphere.draw(context, program_state, model_transform, this.materials.snowfall.override({op: 1 - Math.abs(Math.cos(t ))}));

            }

            for (let i = 0; i < this.snow_amount; i++) {
                let cx = this.pos2[i][0];
                let cy = this.pos2[i][1];
                let cz = this.pos2[i][2];
                model_transform = mT
                    .times(Mat4.translation(cx + 4, cy * p2 + 5, cz))
                    .times(Mat4.translation(-1, 0 , 0))
                    .times(Mat4.rotation(Math.sin(cy * t / 5), 0, 1, 0))
                    .times(Mat4.translation(1, 0 , 0))
                    .times(Mat4.scale(0.2, 0.2, 0.2));
                this.shapes.sphere.draw(context, program_state, model_transform, this.materials.snowfall.override({op: 1 - Math.abs(Math.cos(t * 2 / 3))}));
            }

            if (Math.abs(Math.cos(t)) > .9999 && Math.abs(Math.cos(t * 2 / 3)) > .9999) this.snow_generator();
       }



        //TODO: Glass globe + stand
        const sun_color = color(1, 1, 1, 1);
        const sun_size = 5;
        program_state.lights.push(new Light(vec4(-30,100,0,1), sun_color, 10**sun_size));

        model_transform = mT.times(Mat4.translation(4, 5, 0)).times(Mat4.scale(22,22,22));
        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.glass);


        program_state.lights.push(new Light(vec4(-30,-40,15,1), sun_color, 10**4));
        program_state.lights.push(new Light(vec4(50,-40,15,1), sun_color, 10**4));
        program_state.lights.push(new Light(vec4(0,-10,-40,1), sun_color, 10**3.2));

        model_transform = mT.times(Mat4.translation(4, -18, 0)).times(Mat4.rotation(Math.PI * .5, 1, 0, 0)).times(Mat4.scale( 22, 22, 10));
        this.shapes.cylinder.draw(context, program_state, model_transform, this.materials.test2);
        model_transform = mT.times(Mat4.translation(4, -13, 0)).times(Mat4.rotation(Math.PI * .5, 1, 0, 0)).times(Mat4.scale(22.4,22.4,0.1)).times(Mat4.rotation(Math.PI / 2, 0, 0, 1));
        this.shapes.torus.draw(context, program_state, model_transform, this.materials.test2.override({diffusivity: 1}));


    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 5) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec4 v_color;
        
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                // Compute an initial (ambient) color:
                v_color = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                v_color.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                gl_FragColor = v_color;
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
            center = vec4(0,0,0,1)*model_transform;
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
            point_position = vec4(position, 1);
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
          gl_FragColor = sin(80. * distance(center.xyz, point_position.xyz))*vec4(.69, .502, .251, 1);
        }`;
    }
}

class Snow_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Set uniform parameters
        context.uniform4fv(gpu_addresses.shape_color, material.color);
        context.uniform1f(gpu_addresses.op_val, material.op); // <---
    }

    constructor() {
        super();
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;       
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 ); 
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code() + `
            uniform vec4 shape_color; 
            uniform float op_val; // <---
        
            void main(){              
                vec4 mixed_color = vec4(shape_color.xyz, op_val);
                gl_FragColor = mixed_color;
            } `;
    }
}
