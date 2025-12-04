/*******************生成立方体纹理对象*******************************/
function configureCubeMap(program) {
    gl.activeTexture(gl.TEXTURE0);

    const cubeMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    gl.uniform1i(gl.getUniformLocation(program, "cubeSampler"), 0);

    const faces = [
        ["./skybox/right.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
        ["./skybox/left.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
        ["./skybox/top.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
        ["./skybox/bottom.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
        ["./skybox/front.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
        ["./skybox/back.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
    ];
    
    for (let i = 0; i < 6; i++) {
        const face = faces[i][1];
        const image = new Image();
        image.src = faces[i][0];
        image.onload = (function(cubeMap, face, image) {
            return function() {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            };
        })(cubeMap, face, image);
    }
}

/*TODO1:创建一般2D颜色纹理对象并加载图片（支持基础纹理和凹凸纹理）*/
function configureTexture(image, isNormalMap = false) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // 翻转Y轴（图片坐标系与纹理坐标系对齐）
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    // 纹理参数设置
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    
    // 过滤方式（凹凸纹理用线性过滤，基础纹理用Mipmap）
    const minFilter = isNormalMap ? gl.LINEAR : gl.LINEAR_MIPMAP_LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // 加载纹理图片
    if (image && image.complete) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (!isNormalMap) gl.generateMipmap(gl.TEXTURE_2D); // 基础纹理生成Mipmap
    } else {
        // 加载失败时显示红色提示
        const redPixel = new Uint8Array([255, 0, 0, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, redPixel);
    }
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}
