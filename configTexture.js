/*创建2D纹理（修复潜在的异步加载问题）*/
function configureTexture(image, isNormalMap = false) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // 初始化空白纹理（避免加载延迟导致的纹理未就绪问题）
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255])); // 临时紫色
    
    // 翻转Y轴（关键：图片坐标系与WebGL纹理坐标系对齐）
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    
    // 纹理环绕方式（立方体每个面独立显示，用CLAMP_TO_EDGE避免边缘重复）
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // 过滤方式
    const minFilter = isNormalMap ? gl.LINEAR : gl.LINEAR_MIPMAP_LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // 加载图片并更新纹理
    if (image) {
        image.onload = function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            if (!isNormalMap) gl.generateMipmap(gl.TEXTURE_2D);
        };
        // 强制触发加载（如果图片已缓存）
        if (image.complete) image.onload();
    } else {
        console.error("未提供纹理图片");
    }
    
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}
