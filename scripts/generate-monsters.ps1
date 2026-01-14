# 豆包API生成小怪图片脚本

# API配置
$apiKey = "0940f8e3-f5e4-4430-81ec-b48c6bbfda4c"
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $apiKey"
}

# 定义5个小怪的提示词（中国水墨风格妖怪）
$monsters = @(
    @{id="monster1"; prompt="中国水墨画风格，小妖怪，可爱造型，黑色墨迹，简约线条，透明背景，游戏角色设计"},
    @{id="monster2"; prompt="中国水墨画风格，小恶鬼，圆润造型，黑色墨迹，飘逸线条，透明背景，游戏角色设计"},
    @{id="monster3"; prompt="中国水墨画风格，小魔物，Q版造型，黑色墨迹，流畅线条，透明背景，游戏角色设计"},
    @{id="monster4"; prompt="中国水墨画风格，小妖精，萌系造型，黑色墨迹，灵动线条，透明背景，游戏角色设计"},
    @{id="monster5"; prompt="中国水墨画风格，小怪兽，卡通造型，黑色墨迹，生动线条，透明背景，游戏角色设计"}
)

# 输出目录
$outputDir = "../public/images/monsters"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force
    Write-Host "创建目录: $outputDir" -ForegroundColor Green
}

Write-Host "`n开始生成小怪图片..." -ForegroundColor Cyan
Write-Host "=" * 50

# 批量生成
$successCount = 0
$failCount = 0

foreach ($monster in $monsters) {
    Write-Host "`n正在生成 $($monster.id)..." -ForegroundColor Cyan
    Write-Host "提示词: $($monster.prompt)" -ForegroundColor Gray

    $body = @{
        model = "doubao-seedream-3-0-t2i-250415"
        prompt = $monster.prompt
        size = "512x512"
        watermark = $false
    } | ConvertTo-Json

    try {
        # 调用API
        Write-Host "  调用豆包API..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri "https://ark.cn-beijing.volces.com/api/v3/images/generations" -Method Post -Headers $headers -Body $body

        # 下载图片
        $imageUrl = $response.data[0].url
        $outputFile = Join-Path $outputDir "$($monster.id).png"

        Write-Host "  下载图片..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $imageUrl -OutFile $outputFile

        Write-Host "  ✓ 完成: $outputFile" -ForegroundColor Green
        $successCount++

        # 避免请求过快，添加延迟
        if ($monster.id -ne "monster5") {
            Write-Host "  等待2秒..." -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    }
    catch {
        Write-Host "  ✗ 失败: $_" -ForegroundColor Red
        $failCount++
    }
}

Write-Host "`n" + "=" * 50
Write-Host "生成完成！" -ForegroundColor Green
Write-Host "成功: $successCount 张" -ForegroundColor Green
Write-Host "失败: $failCount 张" -ForegroundColor Red
Write-Host "`n图片保存位置: $outputDir" -ForegroundColor Cyan
