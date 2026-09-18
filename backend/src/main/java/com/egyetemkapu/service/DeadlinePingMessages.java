package com.egyetemkapu.service;

final class DeadlinePingMessages {

    private DeadlinePingMessages() {
    }

    static boolean isEnglish(String language) {
        return language != null && language.equalsIgnoreCase("en");
    }

    static String atDeadline(String language, String title, String type) {
        if (isEnglish(language)) {
            return "Reminder: **" + title + "** (" + type + ") is due now.";
        }
        return "Emlékeztető: most lejár a(z) **" + title + "** (" + type + ") határideje.";
    }

    static String hoursBefore(String language, String title, String type, int hours) {
        if (isEnglish(language)) {
            String unit = hours == 1 ? "hour" : "hours";
            return "Reminder: **" + title + "** (" + type + ") is due in " + hours + " " + unit + ".";
        }
        return "Emlékeztető: " + hours + " óra múlva lejár a(z) **" + title + "** (" + type + ") határideje.";
    }
}
