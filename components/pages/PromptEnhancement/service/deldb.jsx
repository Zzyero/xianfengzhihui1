import React from 'react';

// 定义数据库名称
const DB_NAME = 'promptEnhancementDB';

const DeleteDatabase = () => {
    const handleDeleteDatabase = () => {
        // 发起删除数据库的请求
        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

        deleteRequest.onsuccess = () => {
            console.log('数据库删除成功');
            alert('数据库删除成功');
        };

        deleteRequest.onerror = () => {
            console.error('删除数据库时出错:', deleteRequest.error);
            alert('删除数据库时出错');
        };

        deleteRequest.onblocked = () => {
            console.log('数据库删除被阻塞，请关闭所有使用该数据库的标签页后重试');
            alert('数据库删除被阻塞，请关闭所有使用该数据库的标签页后重试');
        };
    };

    return (
        <button onClick={handleDeleteDatabase}>
            删除数据库
        </button>
    );
};

export default DeleteDatabase;    