$c = [IO.File]::ReadAllLines('c:\Users\mahes\OneDrive\Desktop\csk\index.html')
$css = $c[13..347]
[IO.File]::WriteAllLines('c:\Users\mahes\OneDrive\Desktop\csk\shared.css', $css)
Write-Host "Done - wrote $($css.Count) lines"
