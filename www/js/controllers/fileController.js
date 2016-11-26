(function () {
    'use strict';

    angular
        .module('smoothieApp')
        .controller('FileCtrl', FileCtrl);

    FileCtrl.$inject = ['DataService', 'Upload'];
    var currentRoot = "/ext/";
    function FileCtrl(DataService, Upload) {
        var vm = this;

        vm.fileList = [];
        vm.currentUploadedFile = {};
        vm.currentRoot = currentRoot;
        vm.refreshFiles = refreshFiles;
        vm.print = print;
        vm.progress = progress;
        vm.abort = abort;
        vm.uploadFile = uploadFile;
        vm.deleteFile = deleteFile;

        activate();

        ////////////////

        function activate() {
            refreshFiles(currentRoot);
        }

        function refreshFiles(rootsd) {
            console.log('RefreshFiles');
            currentRoot = rootsd;
            DataService.runCommand("ls " + rootsd)
                .then(function (result_data) {
                    parseFilelist(result_data);
                }, function (error) {
                    console.error(error.statusText);
                });
        }

        function parseFilelist(rawdata) {
            vm.fileList = [];
            var list = rawdata.split('\n');
            angular.forEach(list, function(value, key) {
                value = value.trim();
                if (value.match(/\.g(code)?$/)) {
                    var file = {filename: value, uploading: false, percentage: 0};
                    vm.fileList.push(file);
                }
            });
        }

        function print(file) {
            console.log('print file - ' + currentRoot + file);

            DataService.runCommand("play " + currentRoot + file)
                .then(function (result) {
                    console.log('Result: ' + result);
                });
        }

        function progress() {
            DataService.runCommand("progress")
                .then(function (result_data) {
                    DataService.broadcastCommand(result_data);
                }, function (error) {
                    console.error(error.statusText);
                });
        }

        function abort() {
            DataService.runCommand("abort")
                .then(function (result_data) {
                    DataService.broadcastCommand(result_data);
                }, function (error) {
                    console.error(error.statusText);
                });
        }

        function uploadFile(file) {
            if (file) {
                DataService.broadcastCommand("Uploading: " + file.name + "\n");

                vm.currentUploadedFile = {filename: file.name, uploading: true, percentage: 0};
                vm.fileList.push(vm.currentUploadedFile);

                Upload.upload({
                    url: '/upload',
                    method: 'POST',
                    file: file,
                    data: {
                        'X-Filename': file.name
                    }
                }).then(function (resp) {
                    DataService.broadcastCommand('Upload successful\n');
                    vm.currentUploadedFile.uploading = false;

                    vm.refreshFiles(currentRoot);
                }, function (resp) {
                    DataService.broadcastCommand('Error status: ' + resp.status + "\n");
                }, function (evt) {
                    var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                    vm.currentUploadedFile.percentage = progressPercentage;
                    console.log('Progress: ' + progressPercentage + '%');
                });
            }
        }

        function deleteFile(file) {
            DataService.runCommand("rm " + currentRoot + file.filename)
                .then(function (result_data) {
                    DataService.broadcastCommand("Deleted file: " + currentRoot + file.filename + "\n");
                    vm.refreshFiles(currentRoot);
                }, function (error) {
                    console.error(error.statusText);
                });
        }
    }
}());
