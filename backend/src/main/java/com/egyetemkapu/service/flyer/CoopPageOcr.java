package com.egyetemkapu.service.flyer;

import com.egyetemkapu.service.FlyerCatalogParser.TextRun;

import java.util.List;

@FunctionalInterface
public interface CoopPageOcr {

    List<TextRun> read(byte[] image);
}
