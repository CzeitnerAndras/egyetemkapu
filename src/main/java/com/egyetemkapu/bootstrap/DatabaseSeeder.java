package com.egyetemkapu.bootstrap;

import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {

            User student = new User();
            student.setUsername("diak01");
            student.setPassword(passwordEncoder.encode("user123"));
            student.setRole("ROLE_USER");
            userRepository.save(student);

            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setRole("ROLE_ADMIN");
            userRepository.save(admin);

            System.out.println("Adatbázis sikeresen feltöltve kezdeti tesztadatokkal!");
        } else {
            System.out.println("Az adatbázis már tartalmaz adatokat, a Seeding folyamat kihagyva.");
        }
    }
}