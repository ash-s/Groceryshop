package com.groceryshop.restock;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Sends a daily WhatsApp reminder (and fires the in-app banner data) for pending
 * deliveries that are due or overdue. Stock is only added once the admin confirms
 * the delivery from the Restock page — a late delivery simply keeps reminding.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeliveryReminderScheduler {

    private final RestockHistoryService restockHistoryService;

    @Scheduled(cron = "0 30 9 * * *")
    public void remindPendingDeliveries() {
        int sent = restockHistoryService.sendDueDeliveryReminders();
        if (sent > 0) {
            log.info("Sent {} pending-delivery reminder(s)", sent);
        }
    }
}