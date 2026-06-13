"""
Physics Engine - Policy Validation Agent
Validates orbital policies against physical constraints and sustainability metrics
"""
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from ai.llm_client import get_llm_client
from ai.prompts import validate_metrics


class PolicyType(str, Enum):
    """Types of orbital policies that can be validated"""
    LAUNCH_RATE_LIMIT = "launch_rate_limit"
    DEBRIS_REMOVAL = "debris_removal"
    DEORBIT_TIMELINE = "deorbit_timeline"
    COLLISION_AVOIDANCE = "collision_avoidance"
    ORBITAL_SHELL_CAPACITY = "orbital_shell_capacity"
    HYBRID_STRATEGY = "hybrid_strategy"


class ValidationResult(str, Enum):
    """Validation result status"""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    MARGINAL = "marginal"
    INSUFFICIENT_DATA = "insufficient_data"


class PhysicsEngine:
    """
    Agent 5: Physics Engine - Policy Validation Agent
    
    Capabilities:
    - Validate policies against physical orbital constraints
    - Check compliance with IADC guidelines
    - Assess feasibility of intervention strategies
    - Calculate sustainability thresholds
    - Identify policy conflicts and contradictions
    """
    
    def __init__(self):
        """Initialize physics engine with LLM client"""
        self.llm = get_llm_client()
        self.agent_name = "Physics Engine - Policy Validator"
        
        # Physical constants and thresholds
        self.KESSLER_THRESHOLD = 0.15  # Critical debris density threshold
        self.MAX_COLLISION_FREQUENCY = 20.0  # Collisions per year
        self.MIN_SURVIVABILITY = 70.0  # Minimum acceptable survivability %
        self.IADC_DEORBIT_YEARS = 25  # IADC 25-year rule
    
    async def validate_policy(
        self,
        policy_type: PolicyType,
        policy_params: Dict[str, Any],
        scenario_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate a policy against physical constraints and scenario metrics
        
        Args:
            policy_type: Type of policy to validate
            policy_params: Policy parameters (e.g., launch rate, removal targets)
            scenario_metrics: Current scenario metrics
            
        Returns:
            Validation result with status, violations, and recommendations
        """
        # Validate input metrics
        if not validate_metrics(scenario_metrics):
            return {
                "status": ValidationResult.INSUFFICIENT_DATA,
                "violations": ["Invalid or incomplete scenario metrics"],
                "recommendations": ["Provide complete scenario metrics for validation"]
            }
        
        # Route to appropriate validation method
        if policy_type == PolicyType.LAUNCH_RATE_LIMIT:
            return await self._validate_launch_rate(policy_params, scenario_metrics)
        elif policy_type == PolicyType.DEBRIS_REMOVAL:
            return await self._validate_debris_removal(policy_params, scenario_metrics)
        elif policy_type == PolicyType.DEORBIT_TIMELINE:
            return await self._validate_deorbit_timeline(policy_params, scenario_metrics)
        elif policy_type == PolicyType.COLLISION_AVOIDANCE:
            return await self._validate_collision_avoidance(policy_params, scenario_metrics)
        elif policy_type == PolicyType.ORBITAL_SHELL_CAPACITY:
            return await self._validate_shell_capacity(policy_params, scenario_metrics)
        elif policy_type == PolicyType.HYBRID_STRATEGY:
            return await self._validate_hybrid_strategy(policy_params, scenario_metrics)
        else:
            return {
                "status": ValidationResult.INSUFFICIENT_DATA,
                "violations": [f"Unknown policy type: {policy_type}"],
                "recommendations": ["Use a supported policy type"]
            }
    
    async def _validate_launch_rate(
        self,
        policy_params: Dict[str, Any],
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate launch rate limit policy"""
        max_launches = policy_params.get('max_launches_per_year', 0)
        current_congestion = metrics.get('congestion_index', 0)
        
        violations = []
        recommendations = []
        
        # Check if launch rate is sustainable
        if current_congestion > 100 and max_launches > 500:
            violations.append(
                f"Launch rate of {max_launches}/year exceeds sustainable threshold "
                f"for congestion index {current_congestion}"
            )
            recommendations.append("Reduce launch rate to <500/year or implement ADR")
        
        # Check debris growth implications
        debris_growth = metrics.get('debris_growth_pct', 0)
        if debris_growth > 20 and max_launches > 300:
            violations.append(
                f"Launch rate incompatible with {debris_growth}% debris growth rate"
            )
            recommendations.append("Implement stricter deorbit requirements")
        
        status = ValidationResult.COMPLIANT if not violations else ValidationResult.NON_COMPLIANT
        
        return {
            "status": status,
            "policy_type": PolicyType.LAUNCH_RATE_LIMIT,
            "violations": violations,
            "recommendations": recommendations,
            "physical_constraints": {
                "max_sustainable_launches": self._calculate_max_launches(metrics),
                "current_congestion": current_congestion,
                "debris_growth_rate": debris_growth
            }
        }
    
    async def _validate_debris_removal(
        self,
        policy_params: Dict[str, Any],
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate active debris removal policy"""
        removal_target = policy_params.get('objects_per_year', 0)
        collision_freq = metrics.get('collision_frequency', 0)
        
        violations = []
        recommendations = []
        
        # Check if removal rate is sufficient
        min_removal_needed = self._calculate_min_removal_rate(metrics)
        if removal_target < min_removal_needed:
            violations.append(
                f"Removal rate of {removal_target} objects/year is below minimum "
                f"required rate of {min_removal_needed:.1f} objects/year"
            )
            recommendations.append(f"Increase removal target to at least {min_removal_needed:.0f} objects/year")
        
        # Check feasibility
        if removal_target > 50:
            violations.append(
                f"Removal target of {removal_target} objects/year may exceed "
                "current technological and economic feasibility"
            )
            recommendations.append("Consider phased approach: 10-20 objects/year initially")
        
        status = ValidationResult.COMPLIANT if not violations else (
            ValidationResult.MARGINAL if len(violations) == 1 else ValidationResult.NON_COMPLIANT
        )
        
        return {
            "status": status,
            "policy_type": PolicyType.DEBRIS_REMOVAL,
            "violations": violations,
            "recommendations": recommendations,
            "physical_constraints": {
                "min_removal_rate": min_removal_needed,
                "collision_frequency": collision_freq,
                "feasibility_limit": 50
            }
        }
    
    async def _validate_deorbit_timeline(
        self,
        policy_params: Dict[str, Any],
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate deorbit timeline policy"""
        max_years = policy_params.get('max_years_in_orbit', 25)
        survivability = metrics.get('survivability_pct', 0)
        
        violations = []
        recommendations = []
        
        # Check IADC compliance
        if max_years > self.IADC_DEORBIT_YEARS:
            violations.append(
                f"Deorbit timeline of {max_years} years exceeds IADC 25-year rule"
            )
            recommendations.append("Reduce deorbit timeline to 25 years or less")
        
        # Check survivability implications
        if survivability < self.MIN_SURVIVABILITY and max_years > 15:
            violations.append(
                f"Extended deorbit timeline incompatible with {survivability}% survivability"
            )
            recommendations.append("Reduce timeline to 10-15 years for low survivability scenarios")
        
        status = ValidationResult.COMPLIANT if not violations else ValidationResult.NON_COMPLIANT
        
        return {
            "status": status,
            "policy_type": PolicyType.DEORBIT_TIMELINE,
            "violations": violations,
            "recommendations": recommendations,
            "physical_constraints": {
                "iadc_limit": self.IADC_DEORBIT_YEARS,
                "current_survivability": survivability,
                "recommended_timeline": min(max_years, self.IADC_DEORBIT_YEARS)
            }
        }
    
    async def _validate_collision_avoidance(
        self,
        policy_params: Dict[str, Any],
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate collision avoidance policy"""
        maneuver_threshold = policy_params.get('probability_threshold', 1e-4)
        collision_freq = metrics.get('collision_frequency', 0)
        
        violations = []
        recommendations = []
        
        # Check if threshold is appropriate
        if collision_freq > self.MAX_COLLISION_FREQUENCY and maneuver_threshold > 1e-4:
            violations.append(
                f"Maneuver threshold of {maneuver_threshold} too high for "
                f"collision frequency of {collision_freq}/year"
            )
            recommendations.append("Lower threshold to 1e-5 or implement additional measures")
        
        status = ValidationResult.COMPLIANT if not violations else ValidationResult.MARGINAL
        
        return {
            "status": status,
            "policy_type": PolicyType.COLLISION_AVOIDANCE,
            "violations": violations,
            "recommendations": recommendations,
            "physical_constraints": {
                "collision_frequency": collision_freq,
                "recommended_threshold": 1e-5 if collision_freq > 15 else 1e-4
            }
        }
    
    async def _validate_shell_capacity(
        self,
        policy_params: Dict[str, Any],
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate orbital shell capacity limits"""
        max_objects = policy_params.get('max_objects_per_shell', 1000)
        congestion = metrics.get('congestion_index', 0)
        
        violations = []
        recommendations = []
        
        # Check capacity against congestion
        if congestion > 100 and max_objects > 5000:
            violations.append(
                f"Shell capacity of {max_objects} objects exceeds safe limit "
                f"for congestion index {congestion}"
            )
            recommendations.append("Reduce capacity or distribute across multiple shells")
        
        status = ValidationResult.COMPLIANT if not violations else ValidationResult.NON_COMPLIANT
        
        return {
            "status": status,
            "policy_type": PolicyType.ORBITAL_SHELL_CAPACITY,
            "violations": violations,
            "recommendations": recommendations,
            "physical_constraints": {
                "congestion_index": congestion,
                "safe_capacity": self._calculate_safe_capacity(metrics)
            }
        }
    
    async def _validate_hybrid_strategy(
        self,
        policy_params: Dict[str, Any],
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate hybrid intervention strategy"""
        # Validate each component
        launch_result = await self._validate_launch_rate(
            {"max_launches_per_year": policy_params.get('launch_limit', 500)},
            metrics
        )
        removal_result = await self._validate_debris_removal(
            {"objects_per_year": policy_params.get('removal_rate', 10)},
            metrics
        )
        deorbit_result = await self._validate_deorbit_timeline(
            {"max_years_in_orbit": policy_params.get('deorbit_years', 25)},
            metrics
        )
        
        # Aggregate results
        all_violations = (
            launch_result.get('violations', []) +
            removal_result.get('violations', []) +
            deorbit_result.get('violations', [])
        )
        
        all_recommendations = (
            launch_result.get('recommendations', []) +
            removal_result.get('recommendations', []) +
            deorbit_result.get('recommendations', [])
        )
        
        # Determine overall status
        if not all_violations:
            status = ValidationResult.COMPLIANT
        elif len(all_violations) <= 2:
            status = ValidationResult.MARGINAL
        else:
            status = ValidationResult.NON_COMPLIANT
        
        return {
            "status": status,
            "policy_type": PolicyType.HYBRID_STRATEGY,
            "violations": all_violations,
            "recommendations": all_recommendations,
            "component_results": {
                "launch_rate": launch_result,
                "debris_removal": removal_result,
                "deorbit_timeline": deorbit_result
            }
        }
    
    def _calculate_max_launches(self, metrics: Dict[str, Any]) -> int:
        """Calculate maximum sustainable launch rate"""
        congestion = metrics.get('congestion_index', 100)
        debris_growth = metrics.get('debris_growth_pct', 20)
        
        # Simple heuristic: lower launches for higher congestion/debris
        base_rate = 1000
        congestion_factor = max(0.3, 1 - (congestion - 100) / 200)
        debris_factor = max(0.3, 1 - debris_growth / 100)
        
        return int(base_rate * congestion_factor * debris_factor)
    
    def _calculate_min_removal_rate(self, metrics: Dict[str, Any]) -> float:
        """Calculate minimum required debris removal rate"""
        collision_freq = metrics.get('collision_frequency', 10)
        debris_growth = metrics.get('debris_growth_pct', 20)
        
        # Heuristic: need to remove enough to offset growth
        # Assume each collision creates ~10 trackable debris
        debris_per_year = collision_freq * 10
        growth_rate = debris_growth / 100
        
        return debris_per_year * growth_rate * 0.5  # Remove 50% of growth
    
    def _calculate_safe_capacity(self, metrics: Dict[str, Any]) -> int:
        """Calculate safe orbital shell capacity"""
        congestion = metrics.get('congestion_index', 100)
        
        # Simple capacity model
        if congestion < 80:
            return 10000
        elif congestion < 100:
            return 7000
        elif congestion < 120:
            return 5000
        else:
            return 3000
    
    async def generate_validation_report(
        self,
        validation_results: List[Dict[str, Any]]
    ) -> str:
        """
        Generate comprehensive validation report using LLM
        
        Args:
            validation_results: List of validation results
            
        Returns:
            Formatted validation report
        """
        prompt = self._build_validation_report_prompt(validation_results)
        report = await self.llm.generate(prompt)
        return report.strip()
    
    def _build_validation_report_prompt(
        self,
        validation_results: List[Dict[str, Any]]
    ) -> str:
        """Build prompt for validation report generation"""
        results_summary = "\n\n".join([
            f"Policy: {r.get('policy_type', 'Unknown')}\n"
            f"Status: {r.get('status', 'Unknown')}\n"
            f"Violations: {', '.join(r.get('violations', ['None']))}\n"
            f"Recommendations: {', '.join(r.get('recommendations', ['None']))}"
            for r in validation_results
        ])
        
        return f"""You are the Physics Engine for Orbital Sentinel, validating orbital policies against physical constraints.

Generate a comprehensive validation report based on these results:

{results_summary}

Provide:
1. Overall compliance assessment
2. Critical violations that must be addressed
3. Prioritized recommendations
4. Physical feasibility analysis
5. Risk assessment if policies are not modified

Be technical, precise, and cite specific physical constraints."""


if __name__ == "__main__":
    """Test physics engine"""
    import asyncio
    
    print("=" * 80)
    print("PHYSICS ENGINE - POLICY VALIDATION TEST")
    print("=" * 80)
    
    async def test():
        try:
            engine = PhysicsEngine()
            
            # Test metrics
            test_metrics = {
                'scenario_id': 'test_baseline_2024',
                'collision_frequency': 18.7,
                'debris_growth_pct': 45.2,
                'survivability_pct': 72.5,
                'congestion_index': 125,
                'score': 45,
                'grade': 'D'
            }
            
            # Test 1: Launch rate validation
            print("\n1. Testing Launch Rate Validation:")
            print("-" * 80)
            launch_policy = {'max_launches_per_year': 800}
            result = await engine.validate_policy(
                PolicyType.LAUNCH_RATE_LIMIT,
                launch_policy,
                test_metrics
            )
            print(f"Status: {result['status']}")
            print(f"Violations: {result.get('violations', [])}")
            print(f"Recommendations: {result.get('recommendations', [])}")
            
            # Test 2: Debris removal validation
            print("\n2. Testing Debris Removal Validation:")
            print("-" * 80)
            removal_policy = {'objects_per_year': 5}
            result = await engine.validate_policy(
                PolicyType.DEBRIS_REMOVAL,
                removal_policy,
                test_metrics
            )
            print(f"Status: {result['status']}")
            print(f"Violations: {result.get('violations', [])}")
            print(f"Recommendations: {result.get('recommendations', [])}")
            
            # Test 3: Hybrid strategy validation
            print("\n3. Testing Hybrid Strategy Validation:")
            print("-" * 80)
            hybrid_policy = {
                'launch_limit': 500,
                'removal_rate': 15,
                'deorbit_years': 20
            }
            result = await engine.validate_policy(
                PolicyType.HYBRID_STRATEGY,
                hybrid_policy,
                test_metrics
            )
            print(f"Status: {result['status']}")
            print(f"Total Violations: {len(result.get('violations', []))}")
            print(f"Total Recommendations: {len(result.get('recommendations', []))}")
            
            print("\n✓ Physics engine test complete")
            
        except Exception as e:
            print(f"✗ Error: {e}")
            import traceback
            traceback.print_exc()
    
    asyncio.run(test())
    print("=" * 80)

# Made with Bob