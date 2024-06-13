import type { ModuleDispatchProps } from '@fastgpt/global/core/workflow/type/index.d';
import { NodeInputKeyEnum, NodeOutputKeyEnum } from '@fastgpt/global/core/workflow/constants';
import { DispatchNodeResultType } from '@fastgpt/global/core/workflow/runtime/type';
import axios from 'axios';
import { formatHttpError } from '../utils';
import { DispatchNodeResponseKeyEnum } from '@fastgpt/global/core/workflow/runtime/constants';

type RunCodeType = ModuleDispatchProps<{
  [NodeInputKeyEnum.codeType]: 'js';
  [NodeInputKeyEnum.code]: string;
  [key: string]: any;
}>;
type RunCodeResponse = DispatchNodeResultType<{
  [NodeOutputKeyEnum.error]?: any;
  [NodeOutputKeyEnum.rawResponse]?: Record<string, any>;
  [key: string]: any;
}>;

export const dispatchRunCode = async (props: RunCodeType): Promise<RunCodeResponse> => {
  const {
    params: { codeType, code, ...customVariables }
  } = props;

  const sandBoxRequestUrl = `${process.env.SANDBOX_URL}/sandbox/js`;
  try {
    const { data: runResult } = await axios.post<{
      success: boolean;
      data: {
        codeReturn: Record<string, any>;
        log: string;
      };
    }>(sandBoxRequestUrl, {
      code,
      variables: customVariables
    });

    if (runResult.success) {
      return {
        [NodeOutputKeyEnum.rawResponse]: runResult.data.codeReturn,
        [DispatchNodeResponseKeyEnum.nodeResponse]: {
          customInputs: customVariables,
          customOutputs: runResult.data.codeReturn,
          codeLog: runResult.data.log
        },
        ...runResult.data.codeReturn
      };
    } else {
      throw new Error('Run code failed');
    }
  } catch (error) {
    return {
      [NodeOutputKeyEnum.error]: formatHttpError(error),
      [DispatchNodeResponseKeyEnum.nodeResponse]: {
        customInputs: customVariables,
        error: formatHttpError(error)
      }
    };
  }
};
