package com.groceryshop.device;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;

/** Finds the address a phone on the shop Wi-Fi should use to reach this computer. */
public final class LanAddress {

    private LanAddress() {
    }

    /** First non-loopback, non-link-local IPv4 on an up, physical interface. */
    public static String find() {
        try {
            Enumeration<NetworkInterface> nets = NetworkInterface.getNetworkInterfaces();
            while (nets.hasMoreElements()) {
                NetworkInterface nif = nets.nextElement();
                if (!nif.isUp() || nif.isLoopback() || nif.isVirtual()) continue;
                // Wi-Fi adapters on Windows are often flagged as virtual/point-to-point;
                // only skip the obvious software ones (VPN, Hyper-V, Docker).
                String name = (nif.getName() + " " + nif.getDisplayName()).toLowerCase();
                if (name.contains("vethernet") || name.contains("virtualbox")
                        || name.contains("vmware") || name.contains("docker")
                        || name.contains("loopback")) {
                    continue;
                }
                Enumeration<InetAddress> addrs = nif.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress addr = addrs.nextElement();
                    if (!(addr instanceof Inet4Address)) continue;
                    if (addr.isLoopbackAddress() || addr.isLinkLocalAddress()) continue;
                    if (addr.isSiteLocalAddress()) return addr.getHostAddress();
                }
            }
        } catch (Exception ignored) {
            // Fall through to null - the UI shows a manual hint instead.
        }
        return null;
    }
}
