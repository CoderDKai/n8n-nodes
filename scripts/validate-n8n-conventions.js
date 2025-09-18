#!/usr/bin/env node

/**
 * n8n节点规范验证脚本
 * 用于检查节点是否遵循n8n开发规范
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 验证n8n节点开发规范...\n');

let hasErrors = false;

function logError(message) {
    console.error(`❌ ${message}`);
    hasErrors = true;
}

function logWarning(message) {
    console.warn(`⚠️  ${message}`);
}

function logSuccess(message) {
    console.log(`✅ ${message}`);
}

// 检查package.json配置
function validatePackageJson() {
    console.log('📦 检查package.json配置...');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        if (!packageJson.n8n) {
            logError('package.json缺少n8n配置块');
            return;
        }
        
        const n8nConfig = packageJson.n8n;
        
        if (!n8nConfig.nodes || !Array.isArray(n8nConfig.nodes)) {
            logError('package.json中缺少nodes配置数组');
        } else {
            logSuccess(`配置了${n8nConfig.nodes.length}个节点`);
        }
        
        if (!n8nConfig.credentials || !Array.isArray(n8nConfig.credentials)) {
            logError('package.json中缺少credentials配置数组');
        } else {
            logSuccess(`配置了${n8nConfig.credentials.length}个凭据`);
        }
        
        // 验证文件路径是否存在
        if (n8nConfig.nodes) {
            n8nConfig.nodes.forEach(nodePath => {
                if (!fs.existsSync(nodePath)) {
                    logError(`节点文件不存在: ${nodePath}`);
                } else {
                    logSuccess(`节点文件存在: ${nodePath}`);
                }
            });
        }
        
        if (n8nConfig.credentials) {
            n8nConfig.credentials.forEach(credPath => {
                if (!fs.existsSync(credPath)) {
                    logError(`凭据文件不存在: ${credPath}`);
                } else {
                    logSuccess(`凭据文件存在: ${credPath}`);
                }
            });
        }
        
    } catch (error) {
        logError(`读取package.json失败: ${error.message}`);
    }
}

// 检查节点文件规范
function validateNodeFiles() {
    console.log('\n🔧 检查节点文件规范...');
    
    const nodesDir = 'nodes';
    if (!fs.existsSync(nodesDir)) {
        logError('nodes目录不存在');
        return;
    }
    
    const nodeDirs = fs.readdirSync(nodesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    nodeDirs.forEach(nodeDir => {
        console.log(`\n📁 检查节点: ${nodeDir}`);
        
        const nodeDirPath = path.join(nodesDir, nodeDir);
        const files = fs.readdirSync(nodeDirPath);
        
        // 检查主节点文件
        const nodeFile = files.find(f => f.endsWith('.node.ts'));
        if (!nodeFile) {
            logError(`${nodeDir}目录中缺少.node.ts文件`);
        } else {
            const expectedFileName = `${nodeDir}.node.ts`;
            if (nodeFile !== expectedFileName) {
                logError(`节点文件名不规范: 期望${expectedFileName}, 实际${nodeFile}`);
            } else {
                logSuccess(`节点文件名规范: ${nodeFile}`);
            }
            
            // 检查类名 - 核心规则：类名必须与文件名主要部分一致
            try {
                const nodeContent = fs.readFileSync(path.join(nodeDirPath, nodeFile), 'utf8');
                const classMatch = nodeContent.match(/export class (\w+) implements INodeType/);
                if (classMatch) {
                    const className = classMatch[1];
                    // 从文件名提取预期的类名（去掉.node.ts后缀）
                    const expectedClassName = nodeFile.replace('.node.ts', '');
                    if (className !== expectedClassName) {
                        logError(`❗ 核心规则违反 - 类名与文件名不匹配:`);
                        logError(`   文件: ${nodeFile}`);
                        logError(`   期望类名: ${expectedClassName}`);
                        logError(`   实际类名: ${className}`);
                        logError(`   修复: export class ${expectedClassName} implements INodeType`);
                    } else {
                        logSuccess(`✨ 核心规则遵循 - 类名与文件名匹配: ${className}`);
                    }
                } else {
                    logError(`未找到正确的类定义格式`);
                }
            } catch (error) {
                logError(`读取节点文件失败: ${error.message}`);
            }
        }
        
        // 检查描述文件
        const descFile = files.find(f => f.endsWith('Description.ts'));
        if (!descFile) {
            logWarning(`${nodeDir}目录中缺少Description.ts文件`);
        } else {
            logSuccess(`描述文件存在: ${descFile}`);
        }
        
        // 检查图标文件
        const iconFile = files.find(f => f.endsWith('.svg'));
        if (!iconFile) {
            logWarning(`${nodeDir}目录中缺少.svg图标文件`);
        } else {
            const expectedIconName = nodeDir.toLowerCase() + '.svg';
            if (iconFile !== expectedIconName) {
                logWarning(`图标文件名建议使用小写: ${expectedIconName}`);
            } else {
                logSuccess(`图标文件规范: ${iconFile}`);
            }
        }
        
        // 检查测试目录
        const testDir = path.join(nodeDirPath, '__tests__');
        if (!fs.existsSync(testDir)) {
            logWarning(`${nodeDir}目录中缺少__tests__测试目录`);
        } else {
            logSuccess(`测试目录存在`);
            
            const testFiles = fs.readdirSync(testDir);
            const unitTestFile = testFiles.find(f => f.includes('.node.test.ts'));
            if (!unitTestFile) {
                logWarning(`缺少单元测试文件`);
            } else {
                logSuccess(`单元测试文件存在: ${unitTestFile}`);
            }
        }
    });
}

// 检查凭据文件规范
function validateCredentialFiles() {
    console.log('\n🔐 检查凭据文件规范...');
    
    const credentialsDir = 'credentials';
    if (!fs.existsSync(credentialsDir)) {
        logError('credentials目录不存在');
        return;
    }
    
    const credFiles = fs.readdirSync(credentialsDir)
        .filter(f => f.endsWith('.credentials.ts'));
    
    if (credFiles.length === 0) {
        logWarning('未找到凭据文件');
        return;
    }
    
    credFiles.forEach(credFile => {
        console.log(`\n🔑 检查凭据: ${credFile}`);
        
        try {
            const credContent = fs.readFileSync(path.join(credentialsDir, credFile), 'utf8');
            const classMatch = credContent.match(/export class (\w+) implements ICredentialType/);
            if (classMatch) {
                const className = classMatch[1];
                const expectedClassName = credFile.replace('.credentials.ts', '');
                if (className !== expectedClassName) {
                    logError(`凭据类名不匹配: 期望${expectedClassName}, 实际${className}`);
                } else {
                    logSuccess(`凭据类名匹配: ${className}`);
                }
            } else {
                logError(`未找到正确的凭据类定义格式`);
            }
        } catch (error) {
            logError(`读取凭据文件失败: ${error.message}`);
        }
    });
}

// 检查构建输出
function validateBuildOutput() {
    console.log('\n🏗️  检查构建输出...');
    
    if (!fs.existsSync('dist')) {
        logWarning('dist目录不存在，请先运行构建命令');
        return;
    }
    
    // 检查dist/nodes
    const distNodesDir = 'dist/nodes';
    if (fs.existsSync(distNodesDir)) {
        logSuccess('dist/nodes目录存在');
    } else {
        logError('dist/nodes目录不存在');
    }
    
    // 检查dist/credentials
    const distCredentialsDir = 'dist/credentials';
    if (fs.existsSync(distCredentialsDir)) {
        logSuccess('dist/credentials目录存在');
    } else {
        logError('dist/credentials目录不存在');
    }
}

// 主函数
function main() {
    validatePackageJson();
    validateNodeFiles();
    validateCredentialFiles();
    validateBuildOutput();
    
    console.log('\n' + '='.repeat(50));
    if (hasErrors) {
        console.log('❌ 发现规范问题，请修复后重试');
        process.exit(1);
    } else {
        console.log('✅ 所有规范检查通过！');
    }
}

main();