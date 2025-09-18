# language setting
Always answer user with Chinese.

# Git 规则
当使用 git 命令时，始终添加 `--no-pager` 参数以避免进入分页器交互页面：

## 禁用分页器的命令
- `git --no-pager log` - 查看提交历史，不使用分页器
- `git --no-pager diff` - 查看差异，不使用分页器
- `git --no-pager show` - 显示提交详情，不使用分页器
- `git --no-pager blame` - 查看文件注释，不使用分页器
- `git --no-pager branch` - 列出分支，不使用分页器
- `git --no-pager status` - 查看状态，不使用分页器

## 全局禁用分页器
也可以通过配置全局禁用分页器：
```bash
git config --global core.pager ""
```

## 示例用法
```bash
# 查看最近的提交记录
git --no-pager log --oneline -10

# 查看文件差异
git --no-pager diff HEAD~1

# 查看当前状态
git --no-pager status --short
```