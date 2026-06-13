from datetime import datetime
import uuid
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class SpaceObject(Base):
    __tablename__ = 'space_objects'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    norad_id = Column(Integer, unique=True, nullable=True)
    name = Column(String(255), nullable=False)
    object_type = Column(String(50), nullable=False)  # SATELLITE, DEBRIS, ROCKET_BODY, UNKNOWN
    country_code = Column(String(10), nullable=True)
    launch_date = Column(DateTime, nullable=True)
    mass_kg = Column(Float, nullable=True)
    cross_section_area = Column(Float, nullable=True)  # in m^2
    operational_status = Column(String(50), default="ACTIVE")  # ACTIVE, INACTIVE, DECAYED

    tles = relationship("RawTLE", back_populates="space_object", cascade="all, delete-orphan")
    state_vectors = relationship("OrbitalStateVector", back_populates="space_object", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SpaceObject(name={self.name}, norad_id={self.norad_id}, type={self.object_type})>"

class RawTLE(Base):
    __tablename__ = 'raw_tles'

    id = Column(Integer, primary_key=True, autoincrement=True)
    space_object_id = Column(UUID(as_uuid=True), ForeignKey('space_objects.id', ondelete='CASCADE'), nullable=False)
    norad_id = Column(Integer, nullable=False)
    line1 = Column(String(69), nullable=False)
    line2 = Column(String(69), nullable=False)
    epoch = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    space_object = relationship("SpaceObject", back_populates="tles")

    __table_args__ = (
        UniqueConstraint('space_object_id', 'epoch', name='_object_epoch_uc'),
    )

    def __repr__(self):
        return f"<RawTLE(norad_id={self.norad_id}, epoch={self.epoch})>"

class Scenario(Base):
    __tablename__ = 'scenarios'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    baseline_run_id = Column(UUID(as_uuid=True), nullable=True)
    config = Column(JSON, nullable=False)  # Config rules: policies, start time, step sizes
    created_at = Column(DateTime, default=datetime.utcnow)

    runs = relationship("SimulationRun", back_populates="scenario", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Scenario(name={self.name})>"

class SimulationRun(Base):
    __tablename__ = 'simulation_runs'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scenario_id = Column(UUID(as_uuid=True), ForeignKey('scenarios.id', ondelete='CASCADE'), nullable=False)
    run_timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), nullable=False)  # PENDING, RUNNING, COMPLETED, FAILED
    metrics = Column(JSON, nullable=True)  # Final aggregate run scores
    completed_at = Column(DateTime, nullable=True)

    scenario = relationship("Scenario", back_populates="runs")
    state_vectors = relationship("OrbitalStateVector", back_populates="run", cascade="all, delete-orphan")
    conjunctions = relationship("ConjunctionEvent", back_populates="run", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SimulationRun(id={self.id}, status={self.status})>"

class OrbitalStateVector(Base):
    __tablename__ = 'orbital_state_vectors'

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(UUID(as_uuid=True), ForeignKey('simulation_runs.id', ondelete='CASCADE'), nullable=False)
    space_object_id = Column(UUID(as_uuid=True), ForeignKey('space_objects.id'), nullable=False)
    epoch = Column(DateTime, nullable=False)
    position_x = Column(Float, nullable=False)  # ECI Cartesian Coordinate X (km)
    position_y = Column(Float, nullable=False)  # ECI Cartesian Coordinate Y (km)
    position_z = Column(Float, nullable=False)  # ECI Cartesian Coordinate Z (km)
    velocity_x = Column(Float, nullable=False)  # ECI Velocity X (km/s)
    velocity_y = Column(Float, nullable=False)  # ECI Velocity Y (km/s)
    velocity_z = Column(Float, nullable=False)  # ECI Velocity Z (km/s)
    
    # Ground track details (computed via geodetic mappings)
    latitude = Column(Float, nullable=True)     # degrees
    longitude = Column(Float, nullable=True)    # degrees
    altitude = Column(Float, nullable=True)     # km

    run = relationship("SimulationRun", back_populates="state_vectors")
    space_object = relationship("SpaceObject", back_populates="state_vectors")

    def __repr__(self):
        return f"<OrbitalStateVector(object_id={self.space_object_id}, epoch={self.epoch})>"

class ConjunctionEvent(Base):
    __tablename__ = 'conjunction_events'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey('simulation_runs.id', ondelete='CASCADE'), nullable=False)
    object_1_id = Column(UUID(as_uuid=True), ForeignKey('space_objects.id'), nullable=False)
    object_2_id = Column(UUID(as_uuid=True), ForeignKey('space_objects.id'), nullable=False)
    tca = Column(DateTime, nullable=False)  # Time of Closest Approach
    miss_distance_m = Column(Float, nullable=False)
    relative_velocity_kms = Column(Float, nullable=False)
    collision_probability = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("SimulationRun", back_populates="conjunctions")

    def __repr__(self):
        return f"<ConjunctionEvent(tca={self.tca}, miss_distance={self.miss_distance_m}m)>"
