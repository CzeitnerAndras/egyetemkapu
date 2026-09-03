package com.egyetemkapu.service;

import com.egyetemkapu.model.Document;
import com.egyetemkapu.model.Subject;
import com.egyetemkapu.model.User;
import com.egyetemkapu.repository.DocumentRepository;
import com.egyetemkapu.repository.GradeRepository;
import com.egyetemkapu.repository.NoteRepository;
import com.egyetemkapu.repository.PasswordResetTokenRepository;
import com.egyetemkapu.repository.RefreshTokenRepository;
import com.egyetemkapu.repository.SettingsRepository;
import com.egyetemkapu.repository.SubjectRepository;
import com.egyetemkapu.repository.SuggestionRepository;
import com.egyetemkapu.repository.TaskRepository;
import com.egyetemkapu.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserAccountServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private NoteRepository noteRepository;
    @Mock private SettingsRepository settingsRepository;
    @Mock private SuggestionRepository suggestionRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private GradeRepository gradeRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;

    @InjectMocks
    private UserAccountService userAccountService;

    @TempDir
    Path tempDir;

    @Test
    void deleteAccount_RemovesRelatedRowsAndUploadedFiles() throws Exception {
        User user = new User();
        user.setId(7L);
        user.setUsername("torlendo");

        Path uploaded = tempDir.resolve("jegyzet.pdf");
        Files.writeString(uploaded, "tartalom");

        Document document = new Document();
        document.setFilePath(uploaded.toString());

        Subject subject = new Subject();
        subject.setId(3L);

        when(documentRepository.findByUploader(user)).thenReturn(List.of(document));
        when(subjectRepository.findAllByUser(user)).thenReturn(List.of(subject));

        userAccountService.deleteAccount(user);

        verify(gradeRepository).deleteBySubjectIn(List.of(subject));
        verify(subjectRepository).deleteByUser(user);
        verify(taskRepository).deleteByUser(user);
        verify(noteRepository).deleteByUser(user);
        verify(settingsRepository).deleteByUser(user);
        verify(suggestionRepository).deleteByUser(user);
        verify(documentRepository).deleteByUploader(user);
        verify(refreshTokenRepository).deleteByUser(user);
        verify(passwordResetTokenRepository).deleteByUser(user);
        verify(userRepository).delete(user);
        assertFalse(Files.exists(uploaded));
    }
}
