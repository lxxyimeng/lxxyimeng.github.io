/*******************生成立方体纹理对象*******************************/
function configureCubeMap(program) {
    gl.activeTexture(gl.TEXTURE0);

    const cubeMap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
    // 立方体贴图参数（必须设置边缘环绕）
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // 修复立方体贴图边缘环绕
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
@@ -22,33 +23,32 @@ function configureCubeMap(program) {
    ];

    for (let i = 0; i < 6; i++) {
        const [src, face] = faces[i];
        const face = faces[i][1];
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = src;
        image.src = faces[i][0];
        // 闭包保存当前纹理和面
        image.onload = (function(cubeMap, face, image) {
            return function() {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
                gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            };
        })(cubeMap, face, image);
    }
    return cubeMap;
}

/*TODO1:创建一般2D颜色纹理对象并加载图片（支持基础纹理+凹凸纹理）*/
/*TODO1:创建一般2D颜色纹理对象并加载图片（支持基础纹理和凹凸纹理）*/
function configureTexture(image, isNormalMap = false) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 修复纹理Y轴翻转
    // 翻转Y轴（图片坐标系与纹理坐标系对齐）
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    // 纹理参数设置（凹凸纹理用不同的过滤方式）
    const wrapMode = isNormalMap ? gl.REPEAT : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
    // 纹理参数设置
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    // 过滤方式（凹凸纹理用线性过滤，基础纹理用Mipmap）
    const minFilter = isNormalMap ? gl.LINEAR : gl.LINEAR_MIPMAP_LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
@@ -58,9 +58,9 @@ function configureTexture(image, isNormalMap = false) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (!isNormalMap) gl.generateMipmap(gl.TEXTURE_2D); // 基础纹理生成Mipmap
    } else {
        // 兜底颜色（红色表示加载失败）
        const fallback = new Uint8Array([255, 0, 0, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, fallback);
        // 加载失败时显示红色提示
        const redPixel = new Uint8Array([255, 0, 0, 255]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, redPixel);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
