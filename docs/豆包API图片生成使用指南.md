# 豆包API图片生成使用指南

## 概述

本文档介绍如何使用豆包（Doubao）API生成AI图片，适用于需要批量生成图片资源的项目。

## 前置条件

1. **API密钥**：需要从豆包平台获取API Key
2. **环境**：支持PowerShell的Windows系统，或支持curl的Linux/Mac系统
3. **网络**：能够访问豆包API服务

## API基本信息

### 接口地址
```
https://ark.cn-beijing.volces.com/api/v3/images/generations
```

### 请求方法
```
POST
```

### 请求头
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_API_KEY"
}
```

### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| model | string | 是 | 使用的模型名称 | "doubao-seedream-3-0-t2i-250415" |
| prompt | string | 是 | 图片生成提示词 | "中国古代玉器，精美雕刻" |
| size | string | 是 | 图片尺寸 | "1024x1024" |
| watermark | boolean | 否 | 是否添加水印 | false |

### 可用模型

- `doubao-seedream-3-0-t2i-250415` - 文生图模型（推荐）
- `doubao-seedream-4-5-251128` - 更高级的文生图模型
- 其他模型请参考豆包官方文档

### 支持的图片尺寸

- `1024x1024` - 正方形（推荐）
- `512x512` - 小尺寸正方形
- `1024x768` - 横向矩形
- `768x1024` - 纵向矩形

## 使用方法

### 方法一：PowerShell单张生成

```powershell
# 设置API密钥和请求头
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_API_KEY"
}

# 设置请求体
$body = @{
    model = "doubao-seedream-3-0-t2i-250415"
    prompt = "中国古代玉器，精美雕刻，温润光泽，文物摄影"
    size = "1024x1024"
} | ConvertTo-Json

# 调用API生成图片
$response = Invoke-RestMethod -Uri "https://ark.cn-beijing.volces.com/api/v3/images/generations" -Method Post -Headers $headers -Body $body

# 获取图片URL
$imageUrl = $response.data[0].url

# 下载图片
Invoke-WebRequest -Uri $imageUrl -OutFile "output.jpg"

Write-Host "图片生成完成！"
```

### 方法二：PowerShell批量生成

```powershell
# API配置
$apiKey = "YOUR_API_KEY"
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $apiKey"
}

# 定义要生成的图片列表
$images = @(
    @{id="img1"; prompt="中国古代玉琮，外方内圆，良渚文化"},
    @{id="img2"; prompt="中国古代玉佩，君子佩玉，精美雕刻"},
    @{id="img3"; prompt="中国古代玉璧，圆形玉器，温润光泽"}
)

# 输出目录
$outputDir = "images"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir
}

# 批量生成
foreach ($img in $images) {
    Write-Host "正在生成 $($img.id): $($img.prompt)" -ForegroundColor Cyan
    
    $body = @{
        model = "doubao-seedream-3-0-t2i-250415"
        prompt = $img.prompt
        size = "1024x1024"
    } | ConvertTo-Json
    
    try {
        # 调用API
        $response = Invoke-RestMethod -Uri "https://ark.cn-beijing.volces.com/api/v3/images/generations" -Method Post -Headers $headers -Body $body
        
        # 下载图片
        $imageUrl = $response.data[0].url
        $outputFile = Join-Path $outputDir "$($img.id).jpg"
        Invoke-WebRequest -Uri $imageUrl -OutFile $outputFile
        
        Write-Host "  ✓ 完成: $outputFile" -ForegroundColor Green
        
        # 避免请求过快，添加延迟
        Start-Sleep -Seconds 2
    }
    catch {
        Write-Host "  ✗ 失败: $_" -ForegroundColor Red
    }
}

Write-Host "`n所有图片生成完成！" -ForegroundColor Green
```

### 方法三：curl命令（Linux/Mac）

```bash
# 单张生成
curl https://ark.cn-beijing.volces.com/api/v3/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "doubao-seedream-3-0-t2i-250415",
    "prompt": "中国古代玉器，精美雕刻，温润光泽",
    "size": "1024x1024"
  }'
```

## 提示词编写技巧

### 中文提示词
```
中国古代玉器，精美雕刻，温润光泽，细腻质地，传统文化，历史文物，博物馆展示，柔和灯光，高清摄影，4K画质
```

### 英文提示词
```
Chinese ancient jade artifact, exquisite carving, warm luster, delicate texture, traditional culture, historical relic, museum display, soft lighting, high-definition photography, 4K quality
```

### 提示词结构建议

1. **主体描述**：明确要生成的物体（如：中国古代玉器）
2. **特征描述**：物体的特点（如：精美雕刻、温润光泽）
3. **风格描述**：艺术风格（如：传统文化、历史文物）
4. **场景描述**：展示场景（如：博物馆展示、柔和灯光）
5. **质量描述**：画质要求（如：高清摄影、4K画质）

## 响应格式

### 成功响应

```json
{
  "model": "doubao-seedream-3-0-t2i-250415",
  "created": 1734395307,
  "data": [
    {
      "url": "https://ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com/..."
    }
  ]
}
```

### 错误响应

```json
{
  "error": {
    "message": "错误信息",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

## 注意事项

1. **API限流**：建议在批量生成时添加延迟（2-3秒），避免触发限流
2. **图片有效期**：生成的图片URL有时效性（通常24小时），需及时下载保存
3. **提示词长度**：建议提示词长度在100字符以内，过长可能影响生成效果
4. **中英文混用**：可以使用中文或英文提示词，效果相近
5. **成本控制**：每次API调用都会产生费用，建议合理规划生成数量

## 常见问题

### Q1: 图片生成失败怎么办？

**A**: 检查以下几点：
- API密钥是否正确
- 网络连接是否正常
- 提示词是否符合规范
- 是否触发了限流（添加延迟重试）

### Q2: 如何提高图片质量？

**A**: 
- 使用更详细的提示词
- 在提示词中添加"高清"、"4K"等质量描述
- 选择更大的图片尺寸
- 使用更高级的模型（如doubao-seedream-4-5-251128）

### Q3: 批量生成时如何避免重复？

**A**:
- 为每张图片设置唯一的ID
- 在提示词中添加差异化的描述
- 检查输出文件是否已存在，避免覆盖

### Q4: 图片URL过期了怎么办？

**A**:
- 生成后立即下载保存到本地
- 不要依赖URL长期存储
- 如需重新获取，重新调用API生成

## 最佳实践

1. **提前规划**：列出所有需要生成的图片清单
2. **统一命名**：使用规范的文件命名方式（如：story_s1.jpg）
3. **批量处理**：使用脚本批量生成，提高效率
4. **错误处理**：添加try-catch捕获异常，记录失败项
5. **进度显示**：输出生成进度，便于监控
6. **自动重试**：对失败的请求自动重试2-3次
7. **本地备份**：生成后立即保存到本地，避免URL过期

## 相关资源

- [豆包官方文档](https://www.volcengine.com/docs/82379)
- [API价格说明](https://www.volcengine.com/pricing)

## 更新日志

- **2024-12-17**: 初始版本，基于JadeGuide项目实践经验编写

---

**注意**：请妥善保管API密钥，不要将其提交到代码仓库中。建议使用环境变量或配置文件管理密钥。
