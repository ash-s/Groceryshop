package com.groceryshop.email;

import com.groceryshop.user.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from:grocery.shop.no.reply@gmail.com}")
    private String from;

    @Value("${app.reset-url:http://localhost:5173/reset-password}")
    private String resetUrl;

    public boolean isMailEnabled() {
        return enabled;
    }

    public String buildResetLink(String token) {
        return resetUrl + "?token=" + token;
    }

    public void sendPasswordResetEmail(User user, String token) {
        String link = buildResetLink(token);

        if (!enabled) {
            log.info("[SIMULATED email -> {}] Password reset link: {}", user.getEmail(), link);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(user.getEmail());
            message.setSubject("GroceryShop - Reset your password");
            message.setText("Hi " + user.getFullName() + ",\n\n"
                    + "We received a request to reset your GroceryShop password.\n\n"
                    + "Click the link below to choose a new password (valid for 30 minutes):\n"
                    + link + "\n\n"
                    + "If you didn't request this, you can safely ignore this email.\n\n"
                    + "Thanks,\nThe GroceryShop Team");
            mailSender.send(message);
            log.info("Password reset email sent to {}", user.getEmail());
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", user.getEmail(), e.getMessage());
        }
    }
}