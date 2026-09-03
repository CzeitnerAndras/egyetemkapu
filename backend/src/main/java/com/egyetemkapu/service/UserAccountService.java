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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
public class UserAccountService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final NoteRepository noteRepository;
    private final SettingsRepository settingsRepository;
    private final SuggestionRepository suggestionRepository;
    private final DocumentRepository documentRepository;
    private final SubjectRepository subjectRepository;
    private final GradeRepository gradeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    public UserAccountService(
            UserRepository userRepository,
            TaskRepository taskRepository,
            NoteRepository noteRepository,
            SettingsRepository settingsRepository,
            SuggestionRepository suggestionRepository,
            DocumentRepository documentRepository,
            SubjectRepository subjectRepository,
            GradeRepository gradeRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.noteRepository = noteRepository;
        this.settingsRepository = settingsRepository;
        this.suggestionRepository = suggestionRepository;
        this.documentRepository = documentRepository;
        this.subjectRepository = subjectRepository;
        this.gradeRepository = gradeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    @Transactional
    public void deleteAccount(User user) {
        List<Document> documents = documentRepository.findByUploader(user);
        List<Path> filesToDelete = documents.stream()
                .map(Document::getFilePath)
                .filter(path -> path != null && !path.isBlank())
                .map(Path::of)
                .toList();

        List<Subject> subjects = subjectRepository.findAllByUser(user);
        if (!subjects.isEmpty()) {
            gradeRepository.deleteBySubjectIn(subjects);
        }
        subjectRepository.deleteByUser(user);
        taskRepository.deleteByUser(user);
        noteRepository.deleteByUser(user);
        settingsRepository.deleteByUser(user);
        suggestionRepository.deleteByUser(user);
        documentRepository.deleteByUploader(user);
        refreshTokenRepository.deleteByUser(user);
        passwordResetTokenRepository.deleteByUser(user);
        userRepository.delete(user);

        for (Path file : filesToDelete) {
            try {
                Files.deleteIfExists(file);
            } catch (Exception ignored) {
            }
        }
    }
}
