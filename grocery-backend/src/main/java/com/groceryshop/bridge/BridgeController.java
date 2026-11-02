package com.groceryshop.bridge;

import com.groceryshop.config.UserDetailsServiceConfig;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.user.User;
import com.groceryshop.util.CurrentUserUtil;
import com.groceryshop.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * The phone-to-desk link.
 *
 * <p>The desk creates a session and shows a QR code. The phone joins with the
 * token inside that QR, then streams what it reads. The desk listens on one
 * server-sent-events stream, so a scan lands on screen in the time it takes for
 * the request to arrive - no polling, no refresh, no second app.</p>
 */
@RestController
@RequestMapping("/api/bridge")
@RequiredArgsConstructor
public class BridgeController {

    private final BridgeService bridgeService;
    private final CurrentUserUtil currentUserUtil;
    private final JwtUtil jwtUtil;
    private final UserDetailsServiceConfig userDetailsService;

    /** Desk: start a pairing. */
    @PostMapping("/session")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public BridgeDtos.SessionView createSession() {
        User owner = currentUserUtil.getCurrentUser();
        return view(bridgeService.create(owner.getUsername()));
    }

    /** Desk: has the phone joined yet, and which mode is it in? */
    @GetMapping("/session/{id}")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public BridgeDtos.SessionView session(@PathVariable String id) {
        BridgeSession session = bridgeService.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("This pairing has ended. Show a new code."));
        return view(session);
    }

    /** Desk: tell the phone what a scan means right now. */
    @PostMapping("/session/{id}/mode")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public BridgeDtos.SessionView setMode(@PathVariable String id,
                                          @RequestBody BridgeDtos.ModeRequest body) {
        BridgeSession session = bridgeService.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("This pairing has ended. Show a new code."));
        bridgeService.setMode(session, body == null ? null : body.mode());
        return view(session);
    }

    /** Phone: redeem the QR token (or the typed code) for a session. */
    @PostMapping("/join")
    public BridgeDtos.JoinResponse join(@RequestBody BridgeDtos.JoinRequest body) {
        if (body == null) throw new BadRequestException("Nothing to pair with.");
        BridgeSession session = bridgeService.join(body.code(), body.token(), body.device())
                .orElseThrow(() -> new BadRequestException("This code has expired. Ask the desk to show a new one."));
        // The phone is allowed to bill on behalf of the cashier who paired it.
        UserDetails owner = userDetailsService.loadUserByUsername(session.getOwnerUsername());
        boolean canBill = owner.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_STAFF".equals(authority.getAuthority()));
        return new BridgeDtos.JoinResponse(
                session.getId(),
                session.getMode(),
                session.getToken(),
                jwtUtil.generateToken(owner),
                bridgeService.phoneUrl(session.getToken()),
                canBill);
    }

    /** Phone: one scan. Returns the match so the phone can beep and vibrate at once. */
    @PostMapping("/scan")
    public BridgeDtos.ScanResult scan(@RequestBody BridgeDtos.ScanRequest body) {
        if (body == null || body.token() == null) {
            throw new BadRequestException("This scanner is not paired.");
        }
        BridgeSession session = bridgeService.findByToken(body.token())
                .orElseThrow(() -> new BadRequestException("This scanner is no longer paired."));
        return bridgeService.scan(session, body.code());
    }

    /** Phone: lightweight mode check while the camera stays open. */
    @GetMapping("/state")
    public BridgeDtos.PhoneState state(@RequestParam String token) {
        return bridgeService.findByToken(token)
                .map(session -> {
                    session.touch();
                    return new BridgeDtos.PhoneState(session.getMode(), true);
                })
                .orElseGet(() -> new BridgeDtos.PhoneState("ENDED", false));
    }

    /** Phone: the cart as it stands right now, relayed to the desk screen. */
    @PostMapping("/cart")
    public void cart(@RequestBody java.util.Map<String, Object> body) {
        String token = body == null ? null : (String) body.get("token");
        BridgeSession session = bridgeService.findByToken(token)
                .orElseThrow(() -> new BadRequestException("This scanner is no longer paired."));
        java.util.Map<String, Object> payload = new java.util.LinkedHashMap<>(body);
        payload.remove("token");
        bridgeService.emit(session, "cart", payload);
    }

    /** Phone: switch between "the desk keeps the bill" and "the phone keeps it". */
    @PostMapping("/phone-mode")
    public BridgeDtos.PhoneState phoneMode(@RequestBody java.util.Map<String, String> body) {
        String token = body == null ? null : body.get("token");
        BridgeSession session = bridgeService.findByToken(token)
                .orElseThrow(() -> new BadRequestException("This scanner is no longer paired."));
        bridgeService.setMode(session, body.get("mode"));
        return new BridgeDtos.PhoneState(session.getMode(), true);
    }

    /** Desk: live stream of scans and completed bills. */
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public SseEmitter events(@RequestParam String sessionId) {
        bridgeService.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("This pairing has ended. Show a new code."));
        return bridgeService.subscribe(sessionId);
    }

    private BridgeDtos.SessionView view(BridgeSession session) {
        return new BridgeDtos.SessionView(
                session.getId(),
                session.getCode(),
                bridgeService.phoneUrl(session.getToken()),
                session.getMode(),
                session.isPhoneLive(),
                session.getPhoneLabel(),
                12 * 60 * 60);
    }
}
