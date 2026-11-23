# Indirilenler klasorune gelen sarkilari (adina gore) dogru ulke klasorune tasir.
# Calistir: powershell -ExecutionPolicy Bypass -File araclar\muzik_tasi.ps1   (2 saat izler, sonra kapanir)
$indir = Join-Path $env:USERPROFILE 'Downloads'
$hedef = Join-Path (Split-Path $PSScriptRoot -Parent) 'public\muzik'
$kurallar = [ordered]@{
  'turkiye'     = 'dombra|dombıra|dombora'
  'kurdistan'   = 'leyle|leyla|dilana'
  'suriye'      = 'zdiib|zdib|dabka|dabke|دبكة'
  'afghanistan' = 'rabi|sakhi|to ki mori'
  'azerbaycan'  = 'gara g|bahçalarda|bahcalarda|barım var|barim var'
}
$uzanti = '\.(mp3|m4a|wav|ogg|opus|webm|aac)$'
$bitis = (Get-Date).AddHours(2)
"Izleniyor: $indir -> $hedef (2 saat)"
while ((Get-Date) -lt $bitis) {
  Get-ChildItem $indir -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match $uzanti } | ForEach-Object {
    $ad = $_.Name.ToLower()
    foreach ($ulke in $kurallar.Keys) {
      if ($ad -match $kurallar[$ulke]) {
        try {
          $hedefDosya = Join-Path (Join-Path $hedef $ulke) $_.Name
          Move-Item -LiteralPath $_.FullName -Destination $hedefDosya -Force -ErrorAction Stop
          "$(Get-Date -Format HH:mm:ss) TASINDI: $($_.Name) -> $ulke"
        } catch { }   # dosya hala iniyorsa sonraki turda tekrar dener
        break
      }
    }
  }
  Start-Sleep 3
}
