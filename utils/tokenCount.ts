export function countTokens(text: string): number {
    // 中文直接一字一token；英文用空白分單詞再除以平均4個字母一個token
    const chineseTokens = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishTokens = (text.match(/[a-zA-Z0-9]+/g) || []).reduce((sum, word) => sum + Math.ceil(word.length / 4), 0);

    return chineseTokens + englishTokens;
}
