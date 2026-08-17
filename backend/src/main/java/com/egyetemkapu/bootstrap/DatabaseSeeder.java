package com.egyetemkapu.bootstrap;

import com.egyetemkapu.model.Event;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.EventRepository;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository, EventRepository eventRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.eventRepository = eventRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // --- Felhasználók generálása ---
        if (userRepository.count() == 0) {
            User student = new User();
            student.setUsername("diak01");
            student.setPassword(passwordEncoder.encode("user123"));
            student.setEmail("diak01@egyetemkapu.hu");
            student.setRole("ROLE_USER");
            userRepository.save(student);

            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setEmail("admin@egyetemkapu.hu");
            admin.setRole("ROLE_ADMIN");
            userRepository.save(admin);

            System.out.println("Felhasználók sikeresen feltöltve!");
        }

        // --- Hírek generálása ---
        eventRepository.deleteAll();
        if (eventRepository.count() == 0) {
            Event event = new Event();
            event.setTitle("DEHÖK Gólyatábor 2026");
            event.setDescription("A Debreceni Egyetem Hallgatói Önkormányzata idén is megrendezi a gólyatáborokat! Az ÁJK, ÁOK, ETK, FOK, GYTK, MK, TTK, ZK karok hallgatóinak augusztus 24. és 27. között, míg a BTK, GTK, GYGYK, IK, MÉK karoknak augusztus 31. és szeptember 3. között kerül megrendezésre. A részvételi díj 44.500 Ft. Jelentkezési és postára adási határidő: 2026. augusztus 7. További részletek az online felületen!");
            event.setEventDate(LocalDateTime.of(2026, 8, 24, 8, 0)); 
            event.setImageUrl("/images/golyatabor.webp");
            eventRepository.save(event);
            System.out.println("Feltöltve!");
        }
    }
}