package com.groceryshop.config;

import org.apache.catalina.connector.Connector;
import org.apache.tomcat.util.net.SSLHostConfig;
import org.apache.tomcat.util.net.SSLHostConfigCertificate;
import org.apache.tomcat.util.net.SSLHostConfigCertificate.Type;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/**
 * The shop laptop runs the app on plain http://localhost:8080 — localhost is
 * treated as a secure context, so the laptop's own camera works there.
 *
 * A phone reaching the laptop over the shop Wi-Fi is NOT localhost, and phone
 * browsers only allow the camera on https. So a second, HTTPS-only connector is
 * opened on port 8443 for the phones. Same app, same data, one extra port.
 */
@Configuration
public class HttpsConnectorConfig implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Value("${app.https.port:8443}")
    private int httpsPort;

    @Value("${app.https.keystore-password:groceryshop}")
    private String keystorePassword;

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        if (httpsPort <= 0) return;
        try {
            Path store = materializeKeystore();
            Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
            connector.setPort(httpsPort);
            connector.setSecure(true);
            connector.setScheme("https");
            connector.setProperty("SSLEnabled", "true");

            SSLHostConfig ssl = new SSLHostConfig();
            SSLHostConfigCertificate cert = new SSLHostConfigCertificate(ssl, Type.RSA);
            cert.setCertificateKeystoreFile(store.toAbsolutePath().toString());
            cert.setCertificateKeystorePassword(keystorePassword);
            cert.setCertificateKeystoreType("PKCS12");
            ssl.addCertificate(cert);
            connector.addSslHostConfig(ssl);

            factory.addAdditionalTomcatConnectors(connector);
        } catch (IOException e) {
            // Never stop the app from booting over a TLS problem — the laptop
            // side still works on http. The phone simply cannot scan until fixed.
            System.err.println("HTTPS connector not started: " + e.getMessage());
        }
    }

    /** The keystore ships inside the jar; Tomcat needs a real file path. */
    private Path materializeKeystore() throws IOException {
        Path target = Path.of(System.getProperty("user.home"), ".groceryshop", "https.p12");
        Files.createDirectories(target.getParent());
        try (InputStream in = new ClassPathResource("https.p12").getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return target;
    }
}
