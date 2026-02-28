import {
  DEFAULT_AGENT_COUNT,
  DEFAULT_TEMP_MIN,
  DEFAULT_TEMP_MAX,
  DEFAULT_PERSONAS,
} from '../../constants'
import type { SpawnSettings } from '../../types'

export const defaultSpawnSettings: SpawnSettings = {
  count: DEFAULT_AGENT_COUNT,
  tempMin: DEFAULT_TEMP_MIN,
  tempMax: DEFAULT_TEMP_MAX,
  personas: [...DEFAULT_PERSONAS],
}
