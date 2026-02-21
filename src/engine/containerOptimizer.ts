import type { UnitSlot, ContainerType, ContainerOptimization } from '../types/quote';

/**
 * Container packing optimization using First-Fit-Decreasing heuristic
 * This is a greedy algorithm that:
 * 1. Sorts units by floor area (largest first)
 * 2. For each unit, tries to fit it in an existing container
 * 3. If no fit, opens a new container (smallest that fits)
 *
 * @param units - Array of units to pack
 * @param containerTypes - Available container types
 * @returns Optimization result with container allocation
 */
export function optimizeContainers(
  units: UnitSlot[],
  containerTypes: ContainerType[]
): ContainerOptimization {
  // FIXED: Expand slots by quantity (each physical unit gets one entry)
  const activeUnits: UnitSlot[] = [];
  units.forEach(slot => {
    if (!slot.isEmpty && slot.modelCode !== '0' && slot.containerLength > 0 && slot.containerWidth > 0 && slot.containerHeight > 0) {
      for (let i = 0; i < slot.quantity; i++) {
        activeUnits.push({ ...slot, quantity: 1 });
      }
    }
  });

  if (activeUnits.length === 0) {
    return {
      containers: [],
      totalCost: 0,
      costPerUnit: 0,
      totalContainers: 0,
    };
  }

  // Sort units by floor area (length × width) descending
  const sortedUnits = [...activeUnits].sort((a, b) => {
    const areaA = a.containerLength * a.containerWidth;
    const areaB = b.containerLength * b.containerWidth;
    return areaB - areaA;
  });

  // Sort container types by capacity (smallest first for first-fit)
  const sortedContainers = [...containerTypes].sort((a, b) => {
    const volumeA = a.dimensions.length * a.dimensions.width * a.dimensions.height;
    const volumeB = b.dimensions.length * b.dimensions.width * b.dimensions.height;
    return volumeA - volumeB;
  });

  interface PackedContainer {
    type: ContainerType;
    units: UnitSlot[];
    remainingLength: number;
    remainingWidth: number;
    remainingHeight: number;
    remainingWeight: number;
  }

  const packedContainers: PackedContainer[] = [];

  // First-Fit-Decreasing algorithm
  for (const unit of sortedUnits) {
    let packed = false;

    // Try to fit in existing containers
    for (const container of packedContainers) {
      if (canFitUnit(unit, container)) {
        container.units.push(unit);
        container.remainingLength = Math.max(0, container.remainingLength - unit.containerLength);
        container.remainingWidth = Math.max(0, container.remainingWidth - unit.containerWidth);
        container.remainingHeight = Math.max(0, container.remainingHeight - unit.containerHeight);
        container.remainingWeight -= unit.containerWeight;
        packed = true;
        break;
      }
    }

    // If no fit, open new container
    if (!packed) {
      const suitableContainer = findSmallestSuitableContainer(unit, sortedContainers);

      if (suitableContainer) {
        packedContainers.push({
          type: suitableContainer,
          units: [unit],
          remainingLength: suitableContainer.dimensions.length - unit.containerLength,
          remainingWidth: suitableContainer.dimensions.width - unit.containerWidth,
          remainingHeight: suitableContainer.dimensions.height - unit.containerHeight,
          remainingWeight: suitableContainer.maxWeight - unit.containerWeight,
        });
      } else {
        // Unit doesn't fit in any container - use largest available
        const largestContainer = sortedContainers[sortedContainers.length - 1];
        packedContainers.push({
          type: largestContainer,
          units: [unit],
          remainingLength: largestContainer.dimensions.length - unit.containerLength,
          remainingWidth: largestContainer.dimensions.width - unit.containerWidth,
          remainingHeight: largestContainer.dimensions.height - unit.containerHeight,
          remainingWeight: largestContainer.maxWeight - unit.containerWeight,
        });
      }
    }
  }

  // Calculate utilization for each container
  const containers = packedContainers.map((pc) => {
    const totalVolume = pc.type.dimensions.length * pc.type.dimensions.width * pc.type.dimensions.height;
    const usedVolume = pc.units.reduce(
      (sum, u) => sum + u.containerLength * u.containerWidth * u.containerHeight,
      0
    );
    const utilization = (usedVolume / totalVolume) * 100;

    const usedWeight = pc.units.reduce((sum, u) => sum + u.containerWeight, 0);
    const weightUtilization = (usedWeight / pc.type.maxWeight) * 100;

    return {
      type: pc.type,
      units: pc.units,
      utilization,
      weightUtilization,
    };
  });

  const totalCost = containers.reduce((sum, c) => sum + c.type.costZAR, 0);
  const costPerUnit = activeUnits.length > 0 ? totalCost / activeUnits.length : 0;

  return {
    containers,
    totalCost,
    costPerUnit,
    totalContainers: containers.length,
  };
}

/**
 * Check if a unit can fit in a container
 *
 * @param unit - Unit to check
 * @param container - Packed container
 * @returns True if unit fits
 */
function canFitUnit(unit: UnitSlot, container: { type: ContainerType; remainingLength: number; remainingWidth: number; remainingHeight: number; remainingWeight: number }): boolean {
  // Check dimensions (allow rotation for length/width)
  const fitsStandard =
    unit.containerLength <= container.remainingLength &&
    unit.containerWidth <= container.remainingWidth &&
    unit.containerHeight <= container.remainingHeight;

  const fitsRotated =
    unit.containerWidth <= container.remainingLength &&
    unit.containerLength <= container.remainingWidth &&
    unit.containerHeight <= container.remainingHeight;

  const fitsSize = fitsStandard || fitsRotated;

  // Check weight
  const fitsWeight = unit.containerWeight <= container.remainingWeight;

  return fitsSize && fitsWeight;
}

/**
 * Find the smallest container that can fit the unit
 *
 * @param unit - Unit to fit
 * @param containers - Available container types (sorted by size)
 * @returns Smallest suitable container or null
 */
function findSmallestSuitableContainer(
  unit: UnitSlot,
  containers: ContainerType[]
): ContainerType | null {
  for (const container of containers) {
    const fitsStandard =
      unit.containerLength <= container.dimensions.length &&
      unit.containerWidth <= container.dimensions.width &&
      unit.containerHeight <= container.dimensions.height;

    const fitsRotated =
      unit.containerWidth <= container.dimensions.length &&
      unit.containerLength <= container.dimensions.width &&
      unit.containerHeight <= container.dimensions.height;

    const fitsSize = fitsStandard || fitsRotated;
    const fitsWeight = unit.containerWeight <= container.maxWeight;

    if (fitsSize && fitsWeight) {
      return container;
    }
  }

  return null;
}

/**
 * Calculate average utilization across all containers
 *
 * @param optimization - Container optimization result
 * @returns Average utilization percentage
 */
export function calcAverageUtilization(optimization: ContainerOptimization): number {
  if (optimization.containers.length === 0) return 0;

  const totalUtilization = optimization.containers.reduce((sum, c) => sum + c.utilization, 0);
  return totalUtilization / optimization.containers.length;
}

/**
 * Get container recommendations (warnings about under/over utilization)
 *
 * @param optimization - Container optimization result
 * @returns Array of recommendation messages
 */
export function getContainerRecommendations(optimization: ContainerOptimization): string[] {
  const recommendations: string[] = [];

  optimization.containers.forEach((container, index) => {
    if (container.utilization < 30) {
      recommendations.push(
        `Container ${index + 1} (${container.type.name}) has low utilization (${container.utilization.toFixed(1)}%). Consider consolidating units.`
      );
    }

    if (container.weightUtilization > 90) {
      recommendations.push(
        `Container ${index + 1} (${container.type.name}) is near weight limit (${container.weightUtilization.toFixed(1)}%). Verify shipping regulations.`
      );
    }

    if (container.utilization > 95) {
      recommendations.push(
        `Container ${index + 1} (${container.type.name}) is very tightly packed (${container.utilization.toFixed(1)}%). Ensure adequate loading space.`
      );
    }
  });

  return recommendations;
}
