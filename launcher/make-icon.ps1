# Generates GroceryShop.ico (green basket sign) so the launcher looks like a
# real installed program. Writes a real ICO container (PNG image inside).
# Requires only Windows (.NET/System.Drawing).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $root 'GroceryShop.ico'
$cs  = Join-Path $env:TEMP 'GroceryShopIcon.cs'
$exe = Join-Path $env:TEMP 'GroceryShopIcon.exe'
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'

$src = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        const int size = 256;
        byte[] png;
        using (var bmp = new Bitmap(size, size))
        using (var g = Graphics.FromImage(bmp))
        using (var ms = new MemoryStream())
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);

            // Rounded-square shop sign background.
            using (var brush = new SolidBrush(Color.FromArgb(34, 139, 34)))
                g.FillPath(brush, RoundedRect(new Rectangle(10, 10, size - 20, size - 20), 26));

            // Basket handle.
            using (var pen = new Pen(Color.FromArgb(200, 240, 200), 10))
            {
                pen.StartCap = LineCap.Round;
                pen.EndCap = LineCap.Round;
                g.DrawArc(pen, new Rectangle(size / 2 - 48, size / 2 - 70, 96, 70), 0, 180);
            }

            // Basket body.
            using (var brush = new SolidBrush(Color.FromArgb(210, 245, 210)))
            {
                g.FillEllipse(brush, new Rectangle(size / 2 - 46, size / 2 - 4, 92, 40));
                g.FillRectangle(brush, new Rectangle(size / 2 - 46, size / 2 + 8, 92, 34));
            }

            // Tilak dot.
            using (var brush = new SolidBrush(Color.FromArgb(255, 215, 0)))
                g.FillEllipse(brush, new Rectangle(size / 2 - 6, size / 2 - 6, 12, 12));

            bmp.Save(ms, ImageFormat.Png);
            png = ms.ToArray();
        }

        // Write a real ICO container (one 256x256 32-bit PNG image).
        using (var fs = new FileStream("__OUT_PATH__", FileMode.Create))
        using (var w = new BinaryWriter(fs))
        {
            w.Write((ushort)0);          // idReserved
            w.Write((ushort)1);          // idType = 1 (icon)
            w.Write((ushort)1);          // idCount = 1
            w.Write((byte)0);            // bWidth  (0 = 256)
            w.Write((byte)0);            // bHeight (0 = 256)
            w.Write((byte)0);            // bColorCount
            w.Write((byte)0);            // bReserved
            w.Write((ushort)1);          // wPlanes
            w.Write((ushort)32);         // wBitCount
            w.Write((uint)png.Length);   // dwBytesInRes
            w.Write((uint)22);           // dwImageOffset
            w.Write(png);
        }
    }

    private static GraphicsPath RoundedRect(Rectangle r, int radius)
    {
        var path = new GraphicsPath();
        path.AddArc(r.X, r.Y, radius, radius, 180, 90);
        path.AddArc(r.Right - radius, r.Y, radius, radius, 270, 90);
        path.AddArc(r.Right - radius, r.Bottom - radius, radius, radius, 0, 90);
        path.AddArc(r.X, r.Bottom - radius, radius, radius, 90, 90);
        path.CloseFigure();
        return path;
    }
}
"@

$src = $src.Replace("__OUT_PATH__", $out.Replace('\', '\\'))

Set-Content $cs $src -Encoding utf8
& cmd /c ("`"{0}`" /nologo /target:exe /out:`"{1}`" `"{2}`"" -f $csc, $exe, $cs)
if ($LASTEXITCODE -ne 0) { throw 'csc icon compile failed (exit ' + $LASTEXITCODE + ')' }
& $exe
if (-not (Test-Path $out)) { throw 'icon was not created: ' + $out }
Write-Output "ICON: $out"
