package com.egyetemkapu.service;

final class DeadlinePingMessages {

    private DeadlinePingMessages() {
    }

    static boolean isEnglish(String language) {
        return language != null && language.equalsIgnoreCase("en");
    }

    static String dayBefore(String language, String title, String type) {
        if (isEnglish(language)) {
            return "Reminder: **" + title + "** (" + type + ") is due tomorrow.";
        }
        return "Emlékeztető: holnap lejár a(z) **" + title + "** (" + type + ") határideje.";
    }

    static String twoHoursBefore(String language, String title, String type) {
        if (isEnglish(language)) {
            return "Reminder: **" + title + "** (" + type + ") is due in 2 hours.";
        }
        return "Emlékeztető: 2 óra múlva lejár a(z) **" + title + "** (" + type + ") határideje.";
    }
}
