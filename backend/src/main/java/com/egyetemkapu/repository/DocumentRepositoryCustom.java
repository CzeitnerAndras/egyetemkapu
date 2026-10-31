package com.egyetemkapu.repository;

import java.util.List;

public interface DocumentRepositoryCustom {

    List<DocumentSearchRow> searchApproved(String query, String category);
}
