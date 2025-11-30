interface PaginationResponse<T> {
  endRow: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  isFirstPage: boolean
  isLastPage: boolean
  list: T[]
  navigateFirstPage: number
  navigateLastPage: number
  navigatePages: number
  nextPage: number
  pageNum: number
  pageSize: number
  pages: number
  prePage: number
  size: number
  startRow: number
  total: number
}

interface Survey {
  answerId: number
  batchNo: string
  createTime: string
  isCheck: 0 | 1
  name: string
  symptom: string
  updateTime: string
  userId: number
}

interface SurveyQuestionOption {
  createBy: string
  createTime: string
  delFlag: 0 | 1
  option: string
  optionId: number
  questionId: number
  sort: number
  updateBy: string
  updateTime: string
}

interface SurveyQuestion {
  bg: string
  createBy: string
  createTime: string
  delFlag: 0
  demo: string
  mainId: 0
  options: SurveyQuestionOption[]
  profileField: string
  questionId: number
  required: 0 | 1
  sort: number
  status: 0 | 1
  tips1: string
  tips2: string
  title: string
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
  unit: string
  updateBy: string
  updateTime: string
  userAnswer: string
  other?: string
  me?: string
  jsonConfig?: {
    divider?: number
    title_ext?: string
  }
}

interface SurveyStep {
  batchNo: string
  createBy: string
  createTime: string
  delFlag: 0 | 1
  hasNext: boolean
  id: number
  nextStep: number
  questions: SurveyQuestion[]
  status: 0 | 1
  step: number
  symptomLevel: {
    1: string
    2: string
    3: string
    4: string
    5: string
  }
  tips1: string
  tips2: string
  title: string
  type: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  updateBy: string
  updateTime: string
}
