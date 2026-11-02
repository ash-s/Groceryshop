package com.groceryshop.device;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tells the running app how a phone on the same Wi-Fi can reach it. Nothing is
 * stored or configured by hand - the laptop looks at its own network cards and
 * reports the address, which the frontend turns into a QR code the phone scans.
 */
@RestController
@RequestMapping("/api/device")
public class DeviceInfoController {

    @Value("${app.https.port:8443}")
    private int httpsPort;

    @Value("${server.port:8080}")
    private int httpPort;

    @GetMapping("/address")
    public Map<String, Object> address() {
        Map<String, Object> body = new LinkedHashMap<>();
        String lan = LanAddress.find();
        body.put("lanIp", lan);
        // What a phone should open: https on the LAN address so the camera is allowed.
        body.put("phoneUrl", lan == null ? null : "https://" + lan + ":" + httpsPort);
        body.put("desktopUrl", "http://localhost:" + httpPort);
        body.put("httpsPort", httpsPort);
        return body;
    }
}
