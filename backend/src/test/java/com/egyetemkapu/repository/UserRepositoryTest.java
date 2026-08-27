package com.egyetemkapu.repository;

import com.egyetemkapu.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void testSaveAndFindByEmail_Success() {
        User testUser = new User();
        testUser.setUsername("teszt_elek");
        testUser.setEmail("teszt@egyetemkapu.hu");
        testUser.setPassword("Titkos123!");
        testUser.setRole("ROLE_USER");

        userRepository.save(testUser);
        Optional<User> foundUser = userRepository.findByEmail("teszt@egyetemkapu.hu");

        assertTrue(foundUser.isPresent(), "A felhasználónak benne kell lennie az adatbázisban");
        assertEquals("teszt_elek", foundUser.get().getUsername(), "A felhasználónévnek egyeznie kell");
    }

    @Test
    void testFindByUsername_NotFound() {
        Optional<User> notFoundUser = userRepository.findByUsername("nem_letezo_nev");
        assertFalse(notFoundUser.isPresent(), "Nem szabadna találatot adnia");
    }
}