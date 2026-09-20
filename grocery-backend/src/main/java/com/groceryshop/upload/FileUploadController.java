package com.groceryshop.upload;

import com.groceryshop.dto.UploadResponse;
import com.groceryshop.exception.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/upload")
public class FileUploadController {

    private static final long MAX_SIZE = 5L * 1024 * 1024; // 5 MB
    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp");

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    @PostMapping("/image")
    public ResponseEntity<UploadResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please choose an image file to upload.");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new BadRequestException("Image is too large — maximum size is 5 MB.");
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()
                && !contentType.startsWith("image/")
                && !"application/octet-stream".equals(contentType)) {
            throw new BadRequestException("Only image files can be uploaded.");
        }

        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0) {
            ext = original.substring(dot).toLowerCase(Locale.ROOT);
        }
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BadRequestException("Only JPG, PNG, GIF and WebP images are allowed.");
        }

        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String filename = UUID.randomUUID() + ext;
            file.transferTo(dir.resolve(filename));
            return ResponseEntity.ok(new UploadResponse("/api/uploads/" + filename));
        } catch (IOException e) {
            throw new BadRequestException("Could not save the uploaded image: " + e.getMessage());
        }
    }
}