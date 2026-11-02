GroceryShop - how to run
========================

1. Copy this whole folder onto the shop computer.
2. Double-click  GroceryShop.lnk   (or GroceryShop.exe)
3. The shop opens in its own browser window by itself - no address bar,
   no "localhost" to type, no terminal window.

The laptop stays on; it is the server. Everything - the program, the
database, and every bill - runs on this computer. Nothing goes to the
cloud and there is no monthly cost.

Using your phone as a scanner
-----------------------------
1. In the app, open the Phone panel (shown on the Billing screen).
2. Join the same Wi-Fi as the shop computer on your phone.
3. Open the phone camera and point it at the QR code shown.
4. Tap the link. The shop opens on the phone.
   Scans show on the laptop bill immediately; you can also bill entirely
   on the phone and the laptop mirrors it.

First time only: the phone shows a security notice. Tap
"Advanced", then "Proceed". This is normal for a shop that runs entirely
on its own computer with no internet.

The shop expects a MariaDB/MySQL on this computer at localhost:3306 (root / Admin@123).

To back up, copy the "data" folder somewhere safe.
