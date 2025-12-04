#version 300 es
precision mediump float;

out vec4 FragColor;

// 基础参数
uniform float ambientStrength, specularStrength, diffuseStrength, shininess;
// 进阶效果参数
uniform float transparency;       // 透明度（0.0-1.0）
uniform bool useBumpMap;          // 是否启用凹凸效果
uniform sampler2D bumpMap;        // 凹凸纹理采样器

// 顶点着色器传入变量
in vec3 Normal;
in vec3 FragPos;
in vec2 TexCoord;
in vec4 FragPosLightSpace;

// 全局 uniform
uniform vec3 viewPos;
uniform vec4 u_lightPosition;     // w=1点光源，w=0方向光
uniform vec3 lightColor;
uniform sampler2D diffuseTexture; // 基础纹理
uniform sampler2D depthTexture;   // 阴影贴图
uniform samplerCube cubeSampler;  // 立方体贴图


/*TODO3: 阴影计算（带PCF反走样）*/
float shadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir) {
    // 转换到[-1,1]NDC空间
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    // 映射到[0,1]纹理坐标
    projCoords = projCoords * 0.5 + 0.5;

    // 超出光源范围无阴影
    if (projCoords.z > 1.0) return 0.0;

    // 采样深度贴图
    float closestDepth = texture(depthTexture, projCoords.xy).r;
    float currentDepth = projCoords.z;

    // 计算阴影偏移（解决Shadow Acne）
    float bias = max(0.005 * (1.0 - dot(normal, lightDir)), 0.001);

    // PCF软阴影（反走样）
    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(depthTexture, 0));
    // 3x3采样核
    for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
            float pcfDepth = texture(depthTexture, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += (currentDepth - bias) > pcfDepth ? 1.0 : 0.0;
        }
    }
    // 平均9个采样点
    return shadow / 9.0;
}


void main() {
    // 1. 采样基础纹理颜色
    vec3 textureColor = texture(diffuseTexture, TexCoord).rgb;

    // 2. 凹凸效果实现（修改法向量）
    vec3 norm = normalize(Normal);
    if (useBumpMap) {
        // 从凹凸纹理获取切线空间法向量（范围[-1,1]）
        vec3 bumpNormal = texture(bumpMap, TexCoord).xyz * 2.0 - 1.0;
        
        // 构建TBN矩阵（将切线空间转换到世界空间）
        vec3 viewDir = normalize(viewPos - FragPos);
        vec3 tangent = normalize(cross(vec3(0.0, 1.0, 0.0), norm)); // 临时切线
        vec3 bitangent = cross(norm, tangent);
        mat3 TBN = mat3(tangent, bitangent, norm);
        
        // 应用凹凸效果到法向量
        norm = normalize(TBN * bumpNormal);
    }

    // 3. 计算光照方向
    vec3 lightDir = normalize(u_lightPosition.w == 1.0 
        ? u_lightPosition.xyz - FragPos  // 点光源：从物体指向光源
        : -u_lightPosition.xyz);         // 方向光：光源照射方向（取反）

    /*TODO2: Phong光照模型计算*/
    // 环境光
    vec3 ambient = ambientStrength * lightColor;

    // 漫反射
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diffuseStrength * diff * lightColor;

    // 镜面反射
    vec3 viewDir = normalize(viewPos - FragPos);
    vec3 reflectDir = reflect(-lightDir, norm); // 反射光方向
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * lightColor;

    // 4. 阴影计算
    float shadow = shadowCalculation(FragPosLightSpace, norm, lightDir);

    // 5. 最终颜色混合（光照+纹理+阴影）
    vec3 lighting = ambient + (1.0 - shadow) * (diffuse + specular);
    vec3 resultColor = lighting * textureColor;

    // 6. 半透明效果（对中心立方体应用）
    bool isTransparentObject = (FragPos.x > -1.0 && FragPos.x < 1.0) &&
                              (FragPos.y > -1.0 && FragPos.y < 1.0) &&
                              (FragPos.z > -1.0 && FragPos.z < 1.0);
    float alpha = isTransparentObject ? transparency : 1.0;

    FragColor = vec4(resultColor, alpha);
}
