-- Orbital Sentinel Enhanced Db2 Schema
-- Supports satellite tracking, debris monitoring, and AI analysis caching

-- ============================================================================
-- 1. SATELLITE CATALOG - Master catalog of all space objects
-- ============================================================================
CREATE TABLE satellite_catalog (
    norad_cat_id INTEGER PRIMARY KEY,
    object_name VARCHAR(100) NOT NULL,
    object_id VARCHAR(20) NOT NULL,
    object_type VARCHAR(20) NOT NULL CHECK (object_type IN ('PAYLOAD', 'DEBRIS', 'ROCKET BODY', 'UNKNOWN')),
    launch_date DATE,
    operator VARCHAR(100),
    country VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_satellite_type ON satellite_catalog(object_type);
CREATE INDEX idx_satellite_operator ON satellite_catalog(operator);

-- ============================================================================
-- 2. ORBITAL ELEMENTS - Time-series orbital parameters
-- ============================================================================
CREATE TABLE orbital_elements (
    element_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    norad_cat_id INTEGER NOT NULL,
    epoch TIMESTAMP NOT NULL,
    mean_motion DOUBLE NOT NULL,
    eccentricity DOUBLE NOT NULL,
    inclination DOUBLE NOT NULL,
    ra_of_asc_node DOUBLE NOT NULL,
    arg_of_pericenter DOUBLE NOT NULL,
    mean_anomaly DOUBLE NOT NULL,
    bstar DOUBLE,
    mean_motion_dot DOUBLE,
    mean_motion_ddot DOUBLE,
    altitude_km DOUBLE NOT NULL,
    orbital_shell VARCHAR(50) NOT NULL,
    ephemeris_type INTEGER,
    classification_type VARCHAR(1),
    element_set_no INTEGER,
    rev_at_epoch INTEGER,
    ingestion_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (norad_cat_id) REFERENCES satellite_catalog(norad_cat_id) ON DELETE CASCADE
);

CREATE INDEX idx_orbital_norad ON orbital_elements(norad_cat_id);
CREATE INDEX idx_orbital_epoch ON orbital_elements(epoch);
CREATE INDEX idx_orbital_shell ON orbital_elements(orbital_shell);
CREATE INDEX idx_orbital_altitude ON orbital_elements(altitude_km);

-- ============================================================================
-- 3. DEBRIS EVENTS - Collision and fragmentation events
-- ============================================================================
CREATE TABLE debris_events (
    event_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('COLLISION', 'FRAGMENTATION', 'BREAKUP', 'ASAT', 'UNKNOWN')),
    event_date DATE NOT NULL,
    parent_norad_id INTEGER,
    event_name VARCHAR(200),
    description CLOB,
    debris_count INTEGER,
    orbital_shell VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_norad_id) REFERENCES satellite_catalog(norad_cat_id) ON DELETE SET NULL
);

CREATE INDEX idx_debris_event_type ON debris_events(event_type);
CREATE INDEX idx_debris_event_date ON debris_events(event_date);
CREATE INDEX idx_debris_parent ON debris_events(parent_norad_id);

-- ============================================================================
-- 4. ORBITAL SHELL STATISTICS - Aggregated statistics per shell
-- ============================================================================
CREATE TABLE orbital_shell_stats (
    stat_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orbital_shell VARCHAR(50) NOT NULL,
    snapshot_date DATE NOT NULL,
    total_objects INTEGER NOT NULL,
    active_satellites INTEGER NOT NULL,
    debris_count INTEGER NOT NULL,
    rocket_bodies INTEGER NOT NULL,
    avg_altitude_km DOUBLE,
    min_altitude_km DOUBLE,
    max_altitude_km DOUBLE,
    object_density DOUBLE,
    collision_risk_index DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (orbital_shell, snapshot_date)
);

CREATE INDEX idx_shell_stats_shell ON orbital_shell_stats(orbital_shell);
CREATE INDEX idx_shell_stats_date ON orbital_shell_stats(snapshot_date);

-- ============================================================================
-- 5. AI ANALYSIS CACHE - Cache AI-generated analyses
-- ============================================================================
CREATE TABLE ai_analysis_cache (
    cache_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN ('risk_assessment', 'recommendation', 'sustainability_analysis', 'executive_summary')),
    scenario_id VARCHAR(100),
    metrics_hash VARCHAR(64) NOT NULL,
    content CLOB NOT NULL,
    model_used VARCHAR(50),
    generated_at TIMESTAMP NOT NULL,
    latency_seconds DOUBLE,
    confidence_score DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_ai_cache_type ON ai_analysis_cache(analysis_type);
CREATE INDEX idx_ai_cache_scenario ON ai_analysis_cache(scenario_id);
CREATE INDEX idx_ai_cache_hash ON ai_analysis_cache(metrics_hash);
CREATE INDEX idx_ai_cache_expires ON ai_analysis_cache(expires_at);

-- ============================================================================
-- 6. POLICY DOCUMENTS - Store policy and regulatory documents
-- ============================================================================
CREATE TABLE policy_documents (
    doc_id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    source VARCHAR(200),
    document_type VARCHAR(50),
    content CLOB,
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policy_type ON policy_documents(document_type);
CREATE INDEX idx_policy_source ON policy_documents(source);

-- ============================================================================
-- 7. DOCUMENT EMBEDDINGS - Vector embeddings for semantic search
-- ============================================================================
CREATE TABLE document_embeddings (
    embedding_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id VARCHAR(50) NOT NULL,
    chunk_text CLOB NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding_model VARCHAR(50) NOT NULL,
    embedding_dimension INTEGER NOT NULL,
    -- Note: Db2 11.5.8+ supports VECTOR type, for older versions use BLOB
    -- embedding VECTOR(768),
    embedding BLOB(100K),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doc_id) REFERENCES policy_documents(doc_id) ON DELETE CASCADE
);

CREATE INDEX idx_embedding_doc ON document_embeddings(doc_id);
CREATE INDEX idx_embedding_chunk ON document_embeddings(chunk_index);

-- ============================================================================
-- 8. SIMULATION SCENARIOS - Store simulation configurations
-- ============================================================================
CREATE TABLE simulation_scenarios (
    scenario_id VARCHAR(100) PRIMARY KEY,
    scenario_name VARCHAR(200) NOT NULL,
    intervention_type VARCHAR(50),
    description CLOB,
    parameters CLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_scenario_intervention ON simulation_scenarios(intervention_type);

-- ============================================================================
-- 9. SCENARIO METRICS - Store computed metrics for scenarios
-- ============================================================================
CREATE TABLE scenario_metrics (
    metric_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scenario_id VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DOUBLE NOT NULL,
    metric_unit VARCHAR(50),
    computation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES simulation_scenarios(scenario_id) ON DELETE CASCADE
);

CREATE INDEX idx_metrics_scenario ON scenario_metrics(scenario_id);
CREATE INDEX idx_metrics_name ON scenario_metrics(metric_name);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Latest orbital elements per satellite
CREATE VIEW v_latest_orbital_elements AS
SELECT 
    oe.*,
    sc.object_name,
    sc.object_type,
    sc.operator,
    sc.country
FROM orbital_elements oe
INNER JOIN satellite_catalog sc ON oe.norad_cat_id = sc.norad_cat_id
INNER JOIN (
    SELECT norad_cat_id, MAX(epoch) as max_epoch
    FROM orbital_elements
    GROUP BY norad_cat_id
) latest ON oe.norad_cat_id = latest.norad_cat_id 
    AND oe.epoch = latest.max_epoch;

-- View: Debris statistics by event
CREATE VIEW v_debris_by_event AS
SELECT 
    de.event_id,
    de.event_name,
    de.event_type,
    de.event_date,
    de.debris_count,
    COUNT(sc.norad_cat_id) as tracked_debris_count,
    de.orbital_shell
FROM debris_events de
LEFT JOIN satellite_catalog sc ON sc.object_type = 'DEBRIS'
GROUP BY de.event_id, de.event_name, de.event_type, de.event_date, 
         de.debris_count, de.orbital_shell;

-- View: Current orbital shell summary
CREATE VIEW v_current_shell_summary AS
SELECT 
    oe.orbital_shell,
    COUNT(DISTINCT oe.norad_cat_id) as total_objects,
    SUM(CASE WHEN sc.object_type = 'PAYLOAD' THEN 1 ELSE 0 END) as active_satellites,
    SUM(CASE WHEN sc.object_type = 'DEBRIS' THEN 1 ELSE 0 END) as debris_count,
    SUM(CASE WHEN sc.object_type = 'ROCKET BODY' THEN 1 ELSE 0 END) as rocket_bodies,
    AVG(oe.altitude_km) as avg_altitude_km,
    MIN(oe.altitude_km) as min_altitude_km,
    MAX(oe.altitude_km) as max_altitude_km
FROM v_latest_orbital_elements oe
INNER JOIN satellite_catalog sc ON oe.norad_cat_id = sc.norad_cat_id
GROUP BY oe.orbital_shell;

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- Procedure: Update satellite catalog from orbital elements
CREATE OR REPLACE PROCEDURE sp_update_satellite_catalog()
LANGUAGE SQL
BEGIN
    -- Update existing satellites
    UPDATE satellite_catalog sc
    SET updated_at = CURRENT_TIMESTAMP
    WHERE EXISTS (
        SELECT 1 FROM orbital_elements oe 
        WHERE oe.norad_cat_id = sc.norad_cat_id
    );
    
    -- Insert new satellites
    INSERT INTO satellite_catalog (norad_cat_id, object_name, object_id, object_type)
    SELECT DISTINCT 
        oe.norad_cat_id,
        'UNKNOWN' as object_name,
        'UNKNOWN' as object_id,
        'UNKNOWN' as object_type
    FROM orbital_elements oe
    WHERE NOT EXISTS (
        SELECT 1 FROM satellite_catalog sc 
        WHERE sc.norad_cat_id = oe.norad_cat_id
    );
END;

-- Procedure: Compute daily shell statistics
CREATE OR REPLACE PROCEDURE sp_compute_shell_stats(IN p_date DATE)
LANGUAGE SQL
BEGIN
    DELETE FROM orbital_shell_stats WHERE snapshot_date = p_date;
    
    INSERT INTO orbital_shell_stats (
        orbital_shell, snapshot_date, total_objects, active_satellites,
        debris_count, rocket_bodies, avg_altitude_km, min_altitude_km, max_altitude_km
    )
    SELECT 
        orbital_shell,
        p_date,
        total_objects,
        active_satellites,
        debris_count,
        rocket_bodies,
        avg_altitude_km,
        min_altitude_km,
        max_altitude_km
    FROM v_current_shell_summary;
END;

-- ============================================================================
-- GRANTS (adjust as needed for your security model)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON satellite_catalog TO orbital_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON orbital_elements TO orbital_app_user;
-- GRANT SELECT ON v_latest_orbital_elements TO orbital_app_user;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE satellite_catalog IS 'Master catalog of all tracked space objects';
COMMENT ON TABLE orbital_elements IS 'Time-series orbital parameters (TLE data)';
COMMENT ON TABLE debris_events IS 'Major collision and fragmentation events';
COMMENT ON TABLE orbital_shell_stats IS 'Aggregated statistics per orbital shell';
COMMENT ON TABLE ai_analysis_cache IS 'Cache for AI-generated analyses to reduce latency';
COMMENT ON TABLE policy_documents IS 'Policy and regulatory documents for RAG';
COMMENT ON TABLE document_embeddings IS 'Vector embeddings for semantic search';

-- Made with Bob
