//画布环境初始化设置需要的参数
var canvas;
var gl;
var program;
var skyboxProgram;
var lampPorgram;
var depthProgram;

// 场景物体的参数：顶点数
var skyboxnumPoints; //立方体天空盒顶点数
var cubenumPoints;   //中心物体顶点数
var floornumPoints;  //地面顶点数
var lampnumPoints;   //光源顶点数

// 顶点数据（假设由colorCube、plane等函数生成）
var points = [];
var normalsArray = [];
var texCoordsArray = [];

//场景物体的变换矩阵P，V, M矩阵初始化
var ModelMatrix;    //模型变换矩阵
var ViewMatrix;     //观察变换矩阵
var ProjectionMatrix; //规范化投影矩阵

// 光源参数
var lightRadius = 5.0;  //光源半径
var lightTheta = 0;     //光源绕Y轴旋转角度
var lightPhi = 90;      //光源绕X轴旋转角度
var lightPosition;      //光源位置或方向向量
var lightType = 1;      //w=1点光源，w=0方向光

// 视点参数
var eyeRadius = 15.0;
var eyeTheta = 0.0;
var eyePhi = 90;
var eyePos;
var eyeFov = 55;        //透视俯仰角

// 帧缓冲和纹理
var framebuffer, renderbuffer;
var cubeTexture, planeTexture, bumpTexture, depthTexture;

// 进阶效果参数
var transparency = 0.5; // 半透明度
var useBumpMap = true;  // 启用凹凸效果

// 鼠标参数
let isLeftDragging = false;
let isMiddleDragging = false;
let isRightDragging = false;
let lastX = 0, lastY = 0;

// 场景观察目标点
let targetX = 0;
let targetY = 0;
let targetZ = 0;


/*初始化和复位参数*/
function initParameters() {
    lightTheta = 0;
    lightPhi = 90;
    lightRadius = 5.0;
    lightType = 1;
    lightPosition = vec4(0.0, 0.0, lightRadius, lightType);
    
    eyeRadius = 15.0;
    eyeTheta = 0.0;
    eyePhi = 90;
    eyeFov = 55;

    ModelMatrix = mat4();
    ViewMatrix = mat4();
    ProjectionMatrix = mat4();

    // 进阶参数
    transparency = 0.5;
    useBumpMap = true;
}


/***窗口加载时初始化***/
window.onload = function() {
    canvas = document.getElementById("canvas");
    gl = canvas.getContext('webgl2');
    if (!gl) { alert("WebGL isn't available"); }

    // 初始化着色器
    program = initShaders(gl, "shaders/box.vert", "shaders/box.frag");
    skyboxProgram = initShaders(gl, "shaders/skybox.vert", "shaders/skybox.frag");
    lampPorgram = initShaders(gl, "shaders/lamp.vert", "shaders/lamp.frag");
    depthProgram = initShaders(gl, "shaders/depth.vert", "shaders/depth.frag");

    // 配置WebGL
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0.737255, 0.745098, 0.752941, 1.0);
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    gl.viewport((canvas.width - canvas.height) / 2, 0, canvas.height, canvas.height);

    // 初始化参数
    initParameters();

    // 生成顶点数据
    cubenumPoints = colorCube(1.0);
    floornumPoints = plane(10.0);
    skyboxnumPoints = colorCube(80);
    lampnumPoints = colorCube(0.05);

    // 绑定顶点数据到属性
    initArrayBuffer(gl, program, flatten(points), 4, gl.FLOAT, "vPosition");
    initArrayBuffer(gl, program, flatten(normalsArray), 4, gl.FLOAT, "vNormal");
    initArrayBuffer(gl, program, flatten(texCoordsArray), 2, gl.FLOAT, "vTexCoord");

    // 初始化阴影贴图FBO
    const depthTextureSize = 1024;
    depthTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, depthTextureSize, depthTextureSize, 0, gl.DEPTH_COMPONENT, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    framebuffer.width = depthTextureSize;
    framebuffer.height = depthTextureSize;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        alert('Frame Buffer Not Complete');
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 加载纹理
    gl.useProgram(program);
    // 基础纹理（立方体和地面）
    const cubeTexImage = document.getElementById("cubeTexImage");
    cubeTexture = configureTexture(cubeTexImage);
    const planeTexImage = document.getElementById("planeTexImage");
    planeTexture = configureTexture(planeTexImage);
    // 凹凸纹理
    const bumpTexImage = document.getElementById("bumpTexImage");
    bumpTexture = configureTexture(bumpTexImage, true); // 标记为法线图

    // 配置Phong参数
    configurePhongModelMeterialParameters(program);
    // 配置天空盒
    configureCubeMap(program);
    gl.useProgram(skyboxProgram);
    configureCubeMap(skyboxProgram);
    initArrayBuffer(gl, skyboxProgram, flatten(points), 4, gl.FLOAT, "vPosition");
    
    // 配置光源着色器
    gl.useProgram(lampPorgram);
    configurePhongModelMeterialParameters(lampPorgram);
    initArrayBuffer(gl, lampPorgram, flatten(points), 4, gl.FLOAT, "vPosition");

    // 启动渲染
    render();
}


/******绘制函数******/
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. 渲染阴影贴图
    const lightProjection = perspective(155.0, 1.0, 0.1, 100);
    const lightPos = vec3(lightPosition[0], lightPosition[1], lightPosition[2]);
    const lightView = lookAt(lightPos, vec3(0,0,0), vec3(0,1,0));
    const lightSpaceMatrix = mult(lightProjection, lightView);

    gl.useProgram(depthProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(depthProgram, "u_LightSpaceMatrix"), false, flatten(lightSpaceMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(depthProgram, "u_ModelMatrix"), false, flatten(formModelMatrix()));
    gl.viewport(0, 0, framebuffer.width, framebuffer.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, cubenumPoints);

    // 绘制地面到阴影贴图
    const floorTranslate = mat4(1,0,0,0, 0,1,0,-1, 0,0,1,0, 0,0,0,1);
    const floorScale = mat4(2,0,0,0, 0,0.1,0,0, 0,0,2,0, 0,0,0,1);
    ModelMatrix = mult(floorTranslate, floorScale);
    gl.uniformMatrix4fv(gl.getUniformLocation(depthProgram, "u_ModelMatrix"), false, flatten(ModelMatrix));
    gl.drawArrays(gl.TRIANGLES, cubenumPoints, floornumPoints);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // 2. 渲染主场景
    gl.viewport((canvas.width - canvas.height)/2, 0, canvas.height, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);
    // 传递光源和相机参数
    gl.uniform4fv(gl.getUniformLocation(program, "u_lightPosition"), flatten(lightPosition));
    gl.uniform3fv(gl.getUniformLocation(program, "viewPos"), flatten(eyePos));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_LightSpaceMatrix"), false, flatten(lightSpaceMatrix));

    // 传递变换矩阵
    ModelMatrix = formModelMatrix();
    ViewMatrix = formViewMatrix();
    ProjectionMatrix = formProjectMatrix();
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_ModelMatrix"), false, flatten(ModelMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_ViewMatrix"), false, flatten(ViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_ProjectionMatrix"), false, flatten(ProjectionMatrix));

    // 传递Phong光照参数
    gl.uniform1f(gl.getUniformLocation(program, "ambientStrength"), 0.2);
    gl.uniform1f(gl.getUniformLocation(program, "diffuseStrength"), 0.8);
    gl.uniform1f(gl.getUniformLocation(program, "specularStrength"), 0.5);
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), 32.0);

    // 传递进阶效果参数
    gl.uniform1f(gl.getUniformLocation(program, "transparency"), transparency);
    gl.uniform1i(gl.getUniformLocation(program, "useBumpMap"), useBumpMap ? 1 : 0);

    // 绑定纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
    gl.uniform1i(gl.getUniformLocation(program, "diffuseTexture"), 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.uniform1i(gl.getUniformLocation(program, "depthTexture"), 1);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, bumpTexture);
    gl.uniform1i(gl.getUniformLocation(program, "bumpMap"), 3);

    // 绘制中心立方体
    gl.drawArrays(gl.TRIANGLES, 0, cubenumPoints);

    // 绘制地面
    ModelMatrix = mult(floorTranslate, floorScale);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_ModelMatrix"), false, flatten(ModelMatrix));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, planeTexture);
    gl.drawArrays(gl.TRIANGLES, cubenumPoints, floornumPoints);

    // 绘制光源
    gl.useProgram(lampPorgram);
    ModelMatrix = translate(lightPosition[0], lightPosition[1], lightPosition[2]);
    gl.uniformMatrix4fv(gl.getUniformLocation(lampPorgram, "u_ModelMatrix"), false, flatten(ModelMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(lampPorgram, "u_ViewMatrix"), false, flatten(ViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(lampPorgram, "u_ProjectionMatrix"), false, flatten(ProjectionMatrix));
    gl.drawArrays(gl.TRIANGLES, cubenumPoints + floornumPoints + skyboxnumPoints, lampnumPoints);

    // 绘制天空盒
    gl.useProgram(skyboxProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, "u_ViewMatrix"), false, flatten(ViewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProgram, "u_ProjectionMatrix"), false, flatten(ProjectionMatrix));
    gl.drawArrays(gl.TRIANGLES, cubenumPoints + floornumPoints, skyboxnumPoints);

    requestAnimationFrame(render);
}


/*********辅助函数*********/
// 窗口大小调整
window.onresize = function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    gl.viewport((canvas.width - canvas.height)/2, 0, canvas.height, canvas.height);
};

// 键盘事件
window.onkeydown = function(e) {
    const code = e.keyCode;
    switch (code) {
        case 32: // 空格重置
            initParameters();
            break;
        case 67: // C键点光源
            lightType = 1.0;
            lightPosition = changeLightPositionAndType();
            break;
        case 86: // V键平行光
            lightType = 0.0;
            lightPosition = changeLightPositionAndType();
            break;
        case 89: // Y拉大光源距离
            lightRadius += 0.5;
            lightPosition = changeLightPositionAndType();
            break;
        case 85: // U缩小光源距离
            lightRadius = Math.max(0.5, lightRadius - 0.5);
            lightPosition = changeLightPositionAndType();
            break;
        case 87: // W光源绕X轴顺时针
            lightPhi -= 1;
            lightPosition = changeLightPositionAndType();
            break;
        case 83: // S光源绕X轴逆时针
            lightPhi += 1;
            lightPosition = changeLightPositionAndType();
            break;
        case 65: // A光源绕Y轴顺时针
            lightTheta -= 1;
            lightPosition = changeLightPositionAndType();
            break;
        case 68: // D光源绕Y轴逆时针
            lightTheta += 1;
            lightPosition = changeLightPositionAndType();
            break;
        case 77: // M放大俯仰角
            eyeFov = Math.min(120, eyeFov + 5);
            break;
        case 78: // N缩小俯仰角
            eyeFov = Math.max(10, eyeFov - 5);
            break;
        case 73: // I相机绕X轴上旋
            eyePhi = Math.max(10, eyePhi - 5);
            break;
        case 75: // K相机绕X轴下旋
            eyePhi = Math.min(170, eyePhi + 5);
            break;
        case 74: // J相机绕Y轴左旋
            eyeTheta -= 5;
            break;
        case 76: // L相机绕Y轴右旋
            eyeTheta += 5;
            break;
        case 188: // < 相机靠近
            eyeRadius = Math.max(5, eyeRadius - 1);
            break;
        case 190: // > 相机远离
            eyeRadius += 1;
            break;
        case 80: // P键切换凹凸效果
            useBumpMap = !useBumpMap;
            break;
        case 84: // T键调整透明度
            transparency = (transparency + 0.1) % 1.1;
            break;
    }
};

// 鼠标事件
window.onmousedown = function(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    if (e.button === 0) isLeftDragging = true;
    if (e.button === 1) isMiddleDragging = true;
    if (e.button === 2) isRightDragging = true;
};

window.onmouseup = function() {
    isLeftDragging = isMiddleDragging = isRightDragging = false;
};

window.oncontextmenu = () => false;

window.onmousemove = function(e) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    if (isLeftDragging) {
        eyeTheta -= dx * 0.3;
        eyePhi = Math.max(10, Math.min(170, eyePhi - dy * 0.3));
    }
    if (isMiddleDragging) {
        const panSpeed = 0.001 * eyeRadius;
        targetX -= dx * panSpeed;
        targetY += dy * panSpeed;
    }
    if (isRightDragging) {
        eyeRadius = Math.max(5, eyeRadius + dy * 0.05);
    }

    lastX = e.clientX;
    lastY = e.clientY;
};

window.onwheel = function(e) {
    e.preventDefault();
    eyeRadius = Math.max(5, eyeRadius - e.deltaY * 0.01);
};

// 光源位置更新
function changeLightPositionAndType() {
    return vec4(
        lightRadius * Math.sin(toRad(lightPhi)) * Math.sin(toRad(lightTheta)),
        lightRadius * Math.cos(toRad(lightPhi)),
        lightRadius * Math.sin(toRad(lightPhi)) * Math.cos(toRad(lightTheta)),
        lightType
    );
}

// 角度转弧度
function toRad(deg) {
    return deg * Math.PI / 180;
}

// 模型矩阵
function formModelMatrix() {
    return mat4();
}

// 观察矩阵
function formViewMatrix() {
    eyePos = vec3(
        targetX + eyeRadius * Math.sin(toRad(eyePhi)) * Math.sin(toRad(eyeTheta)),
        targetY + eyeRadius * Math.cos(toRad(eyePhi)),
        targetZ + eyeRadius * Math.sin(toRad(eyePhi)) * Math.cos(toRad(eyeTheta))
    );
    return lookAt(eyePos, vec3(targetX, targetY, targetZ), vec3(0,1,0));
}

// 投影矩阵
function formProjectMatrix() {
    return perspective(eyeFov, 1.0, 0.1, 100);
}

// 初始化数组缓冲
function initArrayBuffer(gl, sp, data, num, type, attribute) {
    const buff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buff);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const attr = gl.getAttribLocation(sp, attribute);
    gl.vertexAttribPointer(attr, num, type, false, 0, 0);
    gl.enableVertexAttribArray(attr);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

// 配置Phong材质参数（假设函数存在）
function configurePhongModelMeterialParameters(program) {
    gl.useProgram(program);
    gl.uniform3fv(gl.getUniformLocation(program, "lightColor"), [1.0, 1.0, 1.0]);
}
